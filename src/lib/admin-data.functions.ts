import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import type { Database } from "@/integrations/supabase/types";

type AdminGateSession = { adminUnlocked?: boolean };

const allowedStatuses = new Set(["under_review", "needs_info", "verified", "rejected"]);

function sessionPassword() {
  const raw = `sham-admin:${process.env["ADMIN_USERNAME"] ?? ""}:${process.env["ADMIN_PASSWORD"] ?? ""}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getSessionConfig() {
  return {
    password: sessionPassword(),
    name: "sham-admin-gate-v3",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

async function assertUnlocked() {
  const session = await useSession<AdminGateSession>(getSessionConfig());
  if (session.data.adminUnlocked !== true) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export const adminListRequests = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = await fetchAll<Database["public"]["Tables"]["verification_requests"]["Row"]>(() =>
    supabaseAdmin
      .from("verification_requests")
      .select(
        "id, user_id, reference, full_name, email, phone, country_code, birth_date, gender, documents, status, admin_note, admin_route, created_at, updated_at",
      )
      .order("created_at", { ascending: false }) as never,
  );
  return rows;
});


export const adminUpdateRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string; note?: string | null; route?: string | null }) => ({
    id: String(data.id),
    status: String(data.status),
    note: data.note ?? null,
    route: data.route ?? null,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("verification_requests")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: data.status as any, admin_note: data.note, admin_route: data.route })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** يوجّه العميل لحظياً حسب بريده — يعمل حتى قبل إنشاء طلب توثيق رسمي */
export const adminSetRoute = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; route: string | null; note?: string | null }) => ({
    email: String(data.email).trim().toLowerCase(),
    route: data.route,
    note: data.note ?? null,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (!data.email) throw new Error("email required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("client_routes" as any)
      .upsert({ email: data.email, route: data.route, note: data.note, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** يوجّه جميع عناوين البريد المرتبطة بجلسة العميل في عملية واحدة */
export const adminSetRoutes = createServerFn({ method: "POST" })
  .inputValidator((data: { emails: string[]; route: string | null; note?: string | null }) => ({
    emails: Array.from(
      new Set(data.emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)),
    ),
    route: data.route,
    note: data.note ?? null,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (data.emails.length === 0) throw new Error("email required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updatedAt = new Date().toISOString();
    const rows = data.emails.map((email) => ({
      email,
      route: data.route,
      note: data.note,
      updated_at: updatedAt,
    }));
    const { error } = await supabaseAdmin.from("client_routes" as any).upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true as const, count: rows.length };
  });

/** ينفّذ قرار الإدارة كاملاً من الخادم كي لا ينفصل التوجيه عن إخفاء البطاقة */
export const adminApplyAction = createServerFn({ method: "POST" })
  .inputValidator((data: {
    key: string;
    emails: string[];
    sessionId?: string | null;
    requestId?: string | null;
    status: string;
    route?: string | null;
    note?: string | null;
    supervisor?: string | null;
  }) => ({
    key: String(data.key).trim().toLowerCase(),
    emails: Array.from(
      new Set(data.emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)),
    ),
    sessionId: data.sessionId ? String(data.sessionId).trim() : null,
    requestId: data.requestId ? String(data.requestId) : null,
    status: String(data.status),
    route: data.route ? String(data.route).trim() : null,
    note: data.note ?? null,
    supervisor: data.supervisor ? String(data.supervisor).trim().slice(0, 40) : null,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (!data.key) throw new Error("customer key required");
    if (!allowedStatuses.has(data.status)) throw new Error("invalid status");
    if (data.route && !data.route.startsWith("/")) throw new Error("invalid route");
    if (data.emails.length === 0 && !data.requestId && !data.sessionId) throw new Error("customer destination required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = data.supervisor || process.env["ADMIN_USERNAME"] || "admin";

    const logEntry = async (success: boolean, error?: string) => {
      await supabaseAdmin.from("admin_redirect_log" as never).insert({
        actor,
        customer_key: data.key,
        emails: data.emails,
        request_id: data.requestId,
        route: data.route,
        status: data.status,
        note: data.note,
        success,
        error: error ?? null,
      } as never);
    };

    try {
      const { data: result, error } = await supabaseAdmin.rpc("admin_apply_customer_action", {
        _key: data.key,
        _emails: data.emails,
        _session_id: data.sessionId as unknown as string,
        _request_id: data.requestId as unknown as string,
        _status: data.status,
        _route: data.route as unknown as string,
        _note: data.note as unknown as string,
        _actor: actor,
      });
      if (error) throw new Error(error.message);
      const completed = result?.[0];
      if (!completed) throw new Error("action was not persisted");
      // حظر نهائي: نثبّته على الخادم حتى يستمر عبر الأجهزة والمتصفحات
      if (data.route === "/YmxvY2tlZA") {
        const rows: Array<{ email: string | null; session_id: string | null; reason: string | null }> = [];
        for (const email of data.emails) rows.push({ email, session_id: null, reason: data.note ?? null });
        if (data.sessionId) rows.push({ email: null, session_id: data.sessionId, reason: data.note ?? null });
        for (const row of rows) {
          try {
            const q = supabaseAdmin.from("blocked_clients").select("id").limit(1);
            const { data: found } = row.email
              ? await q.eq("email", row.email)
              : await q.eq("session_id", row.session_id!);
            if (!found || found.length === 0) await supabaseAdmin.from("blocked_clients").insert(row);
          } catch { /* ignore */ }
        }
      }
      return {
        ok: true as const,
        routed: data.emails.length,
        actedAt: completed.acted_at,
        actionId: completed.action_id,
        status: data.status,
        route: data.route,
        note: data.note,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      try { await logEntry(false, message); } catch { /* ignore log failure */ }
      throw err;
    }
  });

/**
 * يجلب كل الصفوف بلا حد.
 * المهم: الخادم قد يقصّ الدفعة إلى حدّ أقل مما طلبناه (حد الصفوف الافتراضي)،
 * لذلك نتقدّم بعدد الصفوف الفعلي ولا نتوقف إلا عند وصول دفعة فارغة.
 */
async function fetchAll<T>(
  build: () => { range: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }> },
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length === 0) break;
    from += rows.length;
    if (out.length > 500_000) break; // صمّام أمان
  }
  return out;
}


/** يعيد كل عمليات التوجيه لعرضها داخل اللوحة — بدون حد */
export const adminListRedirectLog = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = await fetchAll<{
    id: string;
    actor: string;
    customer_key: string | null;
    emails: string[] | null;
    request_id: string | null;
    route: string | null;
    status: string | null;
    note: string | null;
    success: boolean;
    error: string | null;
    created_at: string;
  }>(() =>
    supabaseAdmin
      .from("admin_redirect_log" as never)
      .select("id, actor, customer_key, emails, request_id, route, status, note, success, error, created_at")
      .order("created_at", { ascending: false }) as never,
  );
  return rows;
});

/** يولّد رابطاً مؤقتاً لعرض مستند مرفوع داخل التخزين الخاص */
export const adminDocumentUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => ({ path: String(data.path) }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });

/** يجلب كل إدخالات العملاء بدون أي حد زمني أو عددي */
export const adminListSubmissions = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cols = "id, user_id, email, kind, payload, page, created_at";
  const rows = await fetchAll<{
    id: string;
    user_id: string | null;
    email: string | null;
    kind: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    page: string | null;
    created_at: string;
  }>(() =>
    supabaseAdmin
      .from("client_submissions")
      .select(cols)
      .order("created_at", { ascending: false }) as never,
  );
  return rows;
});

/** حالة الإجراءات مشتركة بين كل أجهزة الإدارة */
export const adminListActed = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = await fetchAll<{
    key: string; acted_at: string; action_id: string | null; actor: string | null;
    status: string | null; route: string | null; note: string | null;
  }>(() =>
    supabaseAdmin
      .from("admin_acted")
      .select("key, acted_at, action_id, actor, status, route, note")
      .order("acted_at", { ascending: false }) as never,
  );
  const map: Record<string, {
    actedAt: string;
    actionId: string | null;
    actor: string | null;
    status: string | null;
    route: string | null;
    note: string | null;
  }> = {};
  for (const row of data ?? []) {
    map[row.key] = {
      actedAt: row.acted_at,
      actionId: row.action_id,
      actor: row.actor,
      status: row.status,
      route: row.route,
      note: row.note,
    };
  }
  return map;
});

export const adminMarkActed = createServerFn({ method: "POST" })
  .inputValidator((data: { key: string }) => ({ key: String(data.key) }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_acted" as never)
      .upsert({ key: data.key, acted_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** يُسجّل باسم المسؤول أن العميل أكمل تسجيل الخروج من أجهزته، فيعود «بانتظار قرارك» */
export const adminMarkLogoutConfirmed = createServerFn({ method: "POST" })
  .inputValidator((data: { key: string; email?: string | null; sessionId?: string | null; supervisor?: string | null }) => ({
    key: String(data.key),
    email: data.email ? String(data.email).trim().toLowerCase() : null,
    sessionId: data.sessionId ? String(data.sessionId) : null,
    supervisor: data.supervisor ? String(data.supervisor).trim().slice(0, 40) : null,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = data.supervisor || process.env["ADMIN_USERNAME"] || "admin";
    const { error } = await supabaseAdmin.from("client_submissions").insert({
      kind: "logout_confirmed",
      email: data.email,
      page: "/bG9nb3V0LWRldmljZXM",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: { session_id: data.sessionId, marked_by: actor, source: "admin" } as any,
    } as never);
    if (error) throw new Error(error.message);
    // نحذف قيد «تم التصرف» حتى يظهر العميل مجدداً في «بانتظار قرارك»
    await supabaseAdmin.from("admin_acted" as never).delete().eq("key", data.key);
    return { ok: true as const };
  });

export const adminClearActed = createServerFn({ method: "POST" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("admin_acted" as never).delete().neq("key", "");
  if (error) throw new Error(error.message);
  return { ok: true as const };
});

/** يوجّه كل العملاء إلى الرئيسية ويحذف كل الطلبات والإدخالات والقرارات */
export const adminResetAll = createServerFn({ method: "POST" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const now = new Date().toISOString();
  const emails = new Set<string>();
  for (const t of ["verification_requests", "client_submissions", "client_routes"]) {
    const rows = await fetchAll<{ email: string | null }>(() => db.from(t).select("email"));
    for (const r of rows) { const e = r.email?.trim().toLowerCase(); if (e) emails.add(e); }
  }
  const list = [...emails];
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await db.from("client_routes").upsert(
      list.slice(i, i + 500).map((email) => ({ email, route: "/", note: null, updated_at: now })),
    );
    if (error) throw new Error(error.message);
  }
  const s = await db.from("session_routes").update({ route: "/", note: null, updated_at: now }).neq("session_id", "");
  if (s.error) throw new Error(s.error.message);
  for (const [t, col] of [["client_submissions", "id"], ["verification_requests", "id"], ["admin_acted", "key"], ["admin_redirect_log", "id"]] as const) {
    const { error } = await db.from(t).delete().not(col, "is", null);
    if (error) throw new Error(error.message);
  }
  return { ok: true as const, routed: list.length };
});

/** يجلب فقط الإدخالات الأحدث من آخر طابع زمني لدى اللوحة (مزامنة فرقية) */
export const adminListSubmissionsSince = createServerFn({ method: "GET" })
  .inputValidator((d: { since: string }) => {
    if (!d || typeof d.since !== "string" || Number.isNaN(Date.parse(d.since))) throw new Error("invalid since");
    return { since: d.since };
  })
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = await fetchAll<{
      id: string;
      user_id: string | null;
      email: string | null;
      kind: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
      page: string | null;
      created_at: string;
    }>(() =>
      supabaseAdmin
        .from("client_submissions")
        .select("id, user_id, email, kind, payload, page, created_at")
        .gte("created_at", data.since)
        .order("created_at", { ascending: true }) as never,
    );
    return rows;
  });
