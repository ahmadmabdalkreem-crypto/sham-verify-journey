import { createServerFn } from "@tanstack/react-start";
import { useSession, getRequest } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminGateSession = { adminUnlocked?: boolean; adminUser?: string };

function sessionPassword() {
  const raw = `sham-admin:${process.env["ADMIN_USERNAME"] ?? ""}:${process.env["ADMIN_PASSWORD"] ?? ""}`;
  // مفتاح الجلسة يجب ألا يقل عن 32 حرفاً — نشتقّه من القيمة المحفوظة مهما كان طولها.
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getSessionConfig() {
  return {
    password: sessionPassword(),
    // نغيّر رقم الإصدار لإبطال كل جلسات اللوحة القديمة (تسجيل خروج إجباري)
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

function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const isAdminUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminGateSession>(getSessionConfig());
  return {
    unlocked: session.data.adminUnlocked === true,
    username: session.data.adminUser ?? null,
  };
});

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

function clientIp() {
  try {
    const req = getRequest();
    const h = req?.headers;
    const raw = h?.get("x-forwarded-for") ?? h?.get("cf-connecting-ip") ?? "";
    const ip = raw.split(",")[0]?.trim();
    return ip && ip.length > 0 ? ip : "unknown";
  } catch {
    return "unknown";
  }
}

/** يمنع تخمين كلمة مرور اللوحة: 5 محاولات فاشلة خلال 15 دقيقة ⇒ قفل 15 دقيقة. */
async function checkRateLimit(ip: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("ip, fails, window_start, locked_until")
    .eq("ip", ip)
    .maybeSingle();
  const now = Date.now();
  if (data?.locked_until && Date.parse(data.locked_until) > now) {
    return { blocked: true as const, retryAfterSec: Math.ceil((Date.parse(data.locked_until) - now) / 1000) };
  }
  return { blocked: false as const, row: data ?? null };
}

async function recordFailure(ip: string, row: { fails: number; window_start: string } | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const freshWindow = !row || now - Date.parse(row.window_start) > WINDOW_MS;
  const fails = freshWindow ? 1 : row.fails + 1;
  await supabaseAdmin.from("admin_login_attempts").upsert({
    ip,
    fails,
    window_start: freshWindow ? new Date(now).toISOString() : row.window_start,
    locked_until: fails >= MAX_FAILS ? new Date(now + LOCK_MS).toISOString() : null,
  } as never);
}

async function clearFailures(ip: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("admin_login_attempts")
    .upsert({ ip, fails: 0, window_start: new Date().toISOString(), locked_until: null } as never);
}

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => ({
    username: String(data?.username ?? ""),
    password: String(data?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const ip = clientIp();
    let limit: Awaited<ReturnType<typeof checkRateLimit>> | null = null;
    try {
      limit = await checkRateLimit(ip);
    } catch { /* لا تمنع الدخول إذا تعذّر فحص الحد */ }
    if (limit?.blocked) {
      return { ok: false as const, locked: true as const, retryAfterSec: limit.retryAfterSec };
    }

    const pairs: Array<{ user: string | undefined; pass: string | undefined }> = [
      { user: process.env["ADMIN_USERNAME"], pass: process.env["ADMIN_PASSWORD"] },
    ].filter((p) => Boolean(p.user && p.pass));

    if (pairs.length === 0) throw new Error("ADMIN_USERNAME / ADMIN_PASSWORD are not set");

    const typedUser = data.username.trim().toLowerCase();
    const typedPassword = data.password.trim();

    const matched =
      typedUser.length > 0 &&
      typedPassword.length > 0 &&
      pairs.some(
        (p) =>
          passwordMatches(typedUser, p.user!.trim().toLowerCase()) &&
          passwordMatches(typedPassword, p.pass!.trim()),
      );

    if (!matched) {
      try { await recordFailure(ip, limit && !limit.blocked ? limit.row : null); } catch { /* ignore */ }
      return { ok: false as const };
    }

    try { await clearFailures(ip); } catch { /* ignore */ }
    const session = await useSession<AdminGateSession>(getSessionConfig());
    await session.update({ adminUnlocked: true, adminUser: typedUser });
    return { ok: true as const, username: typedUser };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminGateSession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});
