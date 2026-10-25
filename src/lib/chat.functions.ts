import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";

/* =========================================================
   دردشة المشرف ↔ العميل — طبقة مستقلة.
   الجداول مقفلة تمامًا (بدون سياسات وصول عامة)؛ كل وصول يمر من هنا:
   - المشرف: بعد التحقق من جلسة دخول اللوحة.
   - العميل: فقط لدردشته المرتبطة بمعرّف جهازه (أو بريده).
   ========================================================= */

type AdminGateSession = { adminUnlocked?: boolean };

function sessionConfig() {
  const raw = `sham-admin:${process.env["ADMIN_USERNAME"] ?? ""}:${process.env["ADMIN_PASSWORD"] ?? ""}`;
  return {
    password: createHash("sha256").update(raw, "utf8").digest("hex"),
    name: "sham-admin-gate-v3",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function assertAdmin() {
  const s = await useSession<AdminGateSession>(sessionConfig());
  if (s.data.adminUnlocked !== true) throw new Response("Unauthorized", { status: 401 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function db(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const BUCKET = "chat-files";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export type ChatAttachment = { path: string; name: string; size: number; type: string; url?: string };
export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_role: "supervisor" | "client" | "system";
  content: string;
  attachments: ChatAttachment[];
  created_at: string;
  read_at: string | null;
};
export type ChatThread = {
  id: string;
  customer_key: string;
  customer_name: string | null;
  session_id: string | null;
  emails: string[];
  request_id: string | null;
  title: string | null;
  created_at: string;
  last_message_at: string;
  closed_at: string | null;
  deleted_at: string | null;
  admin_typing_at: string | null;
  client_typing_at: string | null;
};

async function isEnabled(sb: Awaited<ReturnType<typeof db>>) {
  const { data } = await sb.from("chat_settings").select("supervisor_client_chat_enabled").eq("id", 1).maybeSingle();
  return data?.supervisor_client_chat_enabled !== false;
}

async function signAttachments(sb: Awaited<ReturnType<typeof db>>, rows: ChatMessage[]) {
  const paths = rows.flatMap((m) => (m.attachments ?? []).map((a) => a.path));
  if (paths.length === 0) return rows;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const map = new Map<string, string>();
  for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  return rows.map((m) => ({ ...m, attachments: (m.attachments ?? []).map((a) => ({ ...a, url: map.get(a.path) })) }));
}

const attachmentInput = z
  .array(z.object({ name: z.string().max(200), type: z.string().max(120), size: z.number().max(10 * 1024 * 1024), base64: z.string() }))
  .max(5)
  .optional();

async function uploadAll(sb: Awaited<ReturnType<typeof db>>, threadId: string, files: z.infer<typeof attachmentInput>) {
  const out: ChatAttachment[] = [];
  for (const f of files ?? []) {
    const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
    const path = `${threadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const bytes = Buffer.from(f.base64, "base64");
    const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: f.type || "application/octet-stream" });
    if (error) throw new Error("تعذّر رفع الملف");
    out.push({ path, name: f.name, size: bytes.length, type: f.type });
  }
  return out;
}

/** إغلاق تلقائي: 7 أيام بدون رسائل، أو عند إغلاق الطلب المرتبط (قبول/رفض نهائي). */
async function autoClose(sb: Awaited<ReturnType<typeof db>>) {
  const cutoff = new Date(Date.now() - SEVEN_DAYS).toISOString();
  await sb.from("chat_threads").update({ closed_at: new Date().toISOString() })
    .is("closed_at", null).is("deleted_at", null).lt("last_message_at", cutoff);
  const { data: open } = await sb.from("chat_threads").select("id, request_id, last_message_at")
    .is("closed_at", null).is("deleted_at", null).not("request_id", "is", null);
  const ids = (open ?? []).map((t: { request_id: string }) => t.request_id);
  if (ids.length === 0) return;
  const { data: reqs } = await sb.from("verification_requests").select("id, status, updated_at").in("id", ids);
  const done = new Map<string, string>();
  for (const r of reqs ?? []) if (r.status === "verified") done.set(r.id, r.updated_at);
  const toClose = (open ?? []).filter((t: { request_id: string; last_message_at: string }) => {
    const at = done.get(t.request_id);
    return at && new Date(at) > new Date(t.last_message_at);
  }).map((t: { id: string }) => t.id);
  if (toClose.length) await sb.from("chat_threads").update({ closed_at: new Date().toISOString() }).in("id", toClose);
}

/* ------------------------- المشرف ------------------------- */

export const chatAdminSettings = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  return { enabled: await isEnabled(await db()) };
});

export const chatAdminSetEnabled = createServerFn({ method: "POST" })
  .inputValidator((d: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const sb = await db();
    await sb.from("chat_settings").update({ supervisor_client_chat_enabled: data.enabled, updated_at: new Date().toISOString() }).eq("id", 1);
    return { enabled: data.enabled };
  });

export const chatAdminList = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const sb = await db();
  if (!(await isEnabled(sb))) return { enabled: false, threads: [] as Array<ChatThread & { unread: number }> };
  await autoClose(sb);
  const { data: threads } = await sb.from("chat_threads").select("*").is("deleted_at", null)
    .order("last_message_at", { ascending: false }).limit(200);
  const ids = (threads ?? []).map((t: ChatThread) => t.id);
  const unread = new Map<string, number>();
  if (ids.length) {
    const { data: msgs } = await sb.from("chat_messages").select("thread_id").in("thread_id", ids)
      .eq("sender_role", "client").is("read_at", null);
    for (const m of msgs ?? []) unread.set(m.thread_id, (unread.get(m.thread_id) ?? 0) + 1);
  }
  return {
    enabled: true,
    threads: (threads ?? []).map((t: ChatThread) => ({ ...t, unread: unread.get(t.id) ?? 0 })) as Array<ChatThread & { unread: number }>,
  };
});

export const chatAdminOpen = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      customerKey: z.string().trim().min(1).max(300),
      name: z.string().max(200).nullable().optional(),
      sessionId: z.string().max(200).nullable().optional(),
      emails: z.array(z.string().max(255)).max(20).default([]),
      requestId: z.string().uuid().nullable().optional(),
      redirect: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const sb = await db();
    if (!(await isEnabled(sb))) throw new Error("الدردشة متوقفة");
    const key = data.customerKey.toLowerCase();
    const emails = Array.from(new Set(data.emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    const { data: existing } = await sb.from("chat_threads").select("*").eq("customer_key", key)
      .is("deleted_at", null).is("closed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    let thread: ChatThread = existing;
    if (thread) {
      const { data: upd } = await sb.from("chat_threads").update({
        session_id: data.sessionId ?? thread.session_id,
        emails: Array.from(new Set([...(thread.emails ?? []), ...emails])),
        request_id: data.requestId ?? thread.request_id,
        customer_name: data.name ?? thread.customer_name,
      }).eq("id", thread.id).select("*").single();
      thread = upd ?? thread;
    } else {
      const { data: created, error } = await sb.from("chat_threads").insert({
        customer_key: key,
        customer_name: data.name ?? null,
        session_id: data.sessionId ?? null,
        emails,
        request_id: data.requestId ?? null,
        title: data.name ? `دردشة مع ${data.name}` : "دردشة مع العميل",
      }).select("*").single();
      if (error) throw new Error("تعذّر إنشاء الدردشة");
      thread = created;
    }
    if (data.redirect) {
      // توجيه العميل إلى صفحة الدردشة بنفس آلية التوجيه الحالية (بدون تغيير حالة الطلب)
      await sb.rpc("admin_apply_customer_action", {
        _key: key, _emails: emails, _session_id: data.sessionId ?? null, _request_id: null,
        _status: "under_review", _route: "/Y2hhdA", _note: "chat", _actor: "admin",
      });
    }
    return thread;
  });

export const chatAdminMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const sb = await db();
    const { data: thread } = await sb.from("chat_threads").select("*").eq("id", data.threadId).is("deleted_at", null).maybeSingle();
    if (!thread) throw new Error("الدردشة غير موجودة");
    await sb.from("chat_messages").update({ read_at: new Date().toISOString() })
      .eq("thread_id", data.threadId).eq("sender_role", "client").is("read_at", null);
    const { data: msgs } = await sb.from("chat_messages").select("*").eq("thread_id", data.threadId).order("created_at").limit(1000);
    let request: { reference: string; status: string } | null = null;
    if (thread.request_id) {
      const { data: r } = await sb.from("verification_requests").select("reference, status").eq("id", thread.request_id).maybeSingle();
      request = r ?? null;
    }
    return { thread: thread as ChatThread, request, messages: await signAttachments(sb, (msgs ?? []) as ChatMessage[]) };
  });

export const chatAdminSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ threadId: z.string().uuid(), content: z.string().max(4000), files: attachmentInput }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const sb = await db();
    const { data: thread } = await sb.from("chat_threads").select("id, closed_at").eq("id", data.threadId).is("deleted_at", null).maybeSingle();
    if (!thread) throw new Error("الدردشة غير موجودة");
    if (thread.closed_at) throw new Error("الدردشة مغلقة");
    const content = data.content.trim();
    const attachments = await uploadAll(sb, data.threadId, data.files);
    if (!content && attachments.length === 0) throw new Error("الرسالة فارغة");
    const now = new Date().toISOString();
    await sb.from("chat_messages").insert({ thread_id: data.threadId, sender_role: "supervisor", content, attachments });
    await sb.from("chat_threads").update({ last_message_at: now, admin_typing_at: null }).eq("id", data.threadId);
    return { ok: true };
  });

export const chatAdminTyping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    await (await db()).from("chat_threads").update({ admin_typing_at: new Date().toISOString() }).eq("id", data.threadId);
    return { ok: true };
  });

export const chatAdminSetState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ threadId: z.string().uuid(), action: z.enum(["close", "reopen", "delete"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const sb = await db();
    const now = new Date().toISOString();
    const patch = data.action === "close" ? { closed_at: now } : data.action === "reopen" ? { closed_at: null, last_message_at: now } : { deleted_at: now };
    await sb.from("chat_threads").update(patch).eq("id", data.threadId);
    if (data.action !== "delete") {
      await sb.from("chat_messages").insert({
        thread_id: data.threadId, sender_role: "system",
        content: data.action === "close" ? "تم إغلاق الدردشة" : "تمت إعادة فتح الدردشة",
      });
    }
    return { ok: true };
  });

/* ------------------------- العميل ------------------------- */

const clientIdentity = z.object({
  sessionId: z.string().trim().min(3).max(200),
  email: z.string().trim().max(255).nullable().optional(),
});

async function findClientThread(sb: Awaited<ReturnType<typeof db>>, sessionId: string, email?: string | null) {
  const { data: bySession } = await sb.from("chat_threads").select("*").eq("session_id", sessionId)
    .is("deleted_at", null).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  if (bySession) return bySession as ChatThread;
  const e = email?.trim().toLowerCase();
  if (!e) return null;
  // البريد وحده يكفي فقط إذا لم تُربط الدردشة بجهاز آخر
  const { data: byEmail } = await sb.from("chat_threads").select("*").contains("emails", [e]).is("session_id", null)
    .is("deleted_at", null).order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  return (byEmail ?? null) as ChatThread | null;
}

export const chatClientState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clientIdentity.parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    if (!(await isEnabled(sb))) return { enabled: false, hasThread: false, unread: 0 };
    const thread = await findClientThread(sb, data.sessionId, data.email);
    if (!thread) return { enabled: true, hasThread: false, unread: 0 };
    const { count } = await sb.from("chat_messages").select("id", { count: "exact", head: true })
      .eq("thread_id", thread.id).eq("sender_role", "supervisor").is("read_at", null);
    return { enabled: true, hasThread: true, unread: count ?? 0 };
  });

export const chatClientMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clientIdentity.parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    if (!(await isEnabled(sb))) return { enabled: false as const };
    const thread = await findClientThread(sb, data.sessionId, data.email);
    if (!thread) return { enabled: true as const, thread: null, messages: [] as ChatMessage[], adminTyping: false };
    await sb.from("chat_messages").update({ read_at: new Date().toISOString() })
      .eq("thread_id", thread.id).eq("sender_role", "supervisor").is("read_at", null);
    const { data: msgs } = await sb.from("chat_messages").select("*").eq("thread_id", thread.id).order("created_at").limit(1000);
    const adminTyping = !!thread.admin_typing_at && Date.now() - new Date(thread.admin_typing_at).getTime() < 4000;
    return {
      enabled: true as const,
      thread: { id: thread.id, closed: !!thread.closed_at },
      messages: await signAttachments(sb, (msgs ?? []) as ChatMessage[]),
      adminTyping,
    };
  });

export const chatClientSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clientIdentity.extend({ content: z.string().max(4000), files: attachmentInput }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    if (!(await isEnabled(sb))) throw new Error("الدردشة غير متاحة");
    const thread = await findClientThread(sb, data.sessionId, data.email);
    if (!thread) throw new Error("لا توجد دردشة");
    if (thread.closed_at) throw new Error("الدردشة مغلقة");
    if (!thread.session_id) await sb.from("chat_threads").update({ session_id: data.sessionId }).eq("id", thread.id);
    const content = data.content.trim();
    const attachments = await uploadAll(sb, thread.id, data.files);
    if (!content && attachments.length === 0) throw new Error("الرسالة فارغة");
    await sb.from("chat_messages").insert({ thread_id: thread.id, sender_role: "client", content, attachments });
    await sb.from("chat_threads").update({ last_message_at: new Date().toISOString(), client_typing_at: null }).eq("id", thread.id);
    return { ok: true };
  });

export const chatClientTyping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clientIdentity.parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const thread = await findClientThread(sb, data.sessionId, data.email);
    if (thread) await sb.from("chat_threads").update({ client_typing_at: new Date().toISOString() }).eq("id", thread.id);
    return { ok: true };
  });
