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

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "" };
});

type SubscriptionInput = {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  deviceLabel?: string;
  userAgent?: string;
};

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: SubscriptionInput) => data)
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      endpoint: data.subscription.endpoint,
      p256dh: data.subscription.keys.p256dh,
      auth: data.subscription.keys.auth,
      device_label: data.deviceLabel ?? null,
      user_agent: data.userAgent ?? null,
      last_success_at: new Date().toISOString(),
      failure_count: 0,
    };
    await (supabaseAdmin as never as { from: (t: string) => { upsert: (v: unknown, o: unknown) => Promise<{ error: unknown }> } })
      .from("push_subscriptions")
      .upsert(row, { onConflict: "endpoint" });
    return { ok: true as const };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as never as { from: (t: string) => { delete: () => { eq: (c: string, v: unknown) => Promise<unknown> } } })
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint);
    return { ok: true as const };
  });

export const listPushDevices = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as never as {
    from: (t: string) => {
      select: (c: string) => { order: (c: string, o: unknown) => Promise<{ data: unknown[] | null }> };
    };
  })
    .from("push_subscriptions")
    .select("id, endpoint, device_label, user_agent, created_at, last_success_at, last_failure_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    endpoint: string;
    device_label: string | null;
    user_agent: string | null;
    created_at: string;
    last_success_at: string | null;
    last_failure_at: string | null;
  }>;
});

export const sendTestPush = createServerFn({ method: "POST" })
  .inputValidator((data: { endpoint?: string } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushTo } = await import("@/lib/push-server");
    const base = (supabaseAdmin as never as {
      from: (t: string) => {
        select: (c: string) => Promise<{ data: unknown[] | null }> & {
          eq: (c: string, v: unknown) => Promise<{ data: unknown[] | null }>;
        };
      };
    }).from("push_subscriptions").select("id, endpoint, p256dh, auth, device_label");
    const { data: rows } = data.endpoint ? await base.eq("endpoint", data.endpoint) : await base;
    const list = (rows ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string; device_label: string | null }>;
    const payload = {
      title: "اختبار الإشعارات",
      body: "الإشعارات في الخلفية تعمل ✅",
      url: "/ZGFzaGJvYXJk",
      tag: `test-${Date.now()}`,
    };
    const results = await Promise.all(list.map(async (row) => {
      const r = await sendPushTo(row, payload);
      const now = new Date().toISOString();
      if (r.ok) {
        await (supabaseAdmin as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: unknown) => Promise<unknown> } } })
          .from("push_subscriptions").update({ last_success_at: now, failure_count: 0 }).eq("id", row.id);
        return { id: row.id, label: row.device_label, ok: true as const };
      }
      if (r.status === 404 || r.status === 410) {
        await (supabaseAdmin as never as { from: (t: string) => { delete: () => { eq: (c: string, v: unknown) => Promise<unknown> } } })
          .from("push_subscriptions").delete().eq("id", row.id);
        return { id: row.id, label: row.device_label, ok: false as const, status: r.status, removed: true as const };
      }
      await (supabaseAdmin as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: unknown) => Promise<unknown> } } })
        .from("push_subscriptions").update({ last_failure_at: now, failure_count: 1 }).eq("id", row.id);
      return { id: row.id, label: row.device_label, ok: false as const, status: r.status, removed: false as const };
    }));
    return {
      total: list.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok && !("removed" in r && r.removed)).length,
      removed: results.filter((r) => "removed" in r && r.removed).length,
      results,
    };
  });

export const sendAdminBroadcast = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; body: string; url?: string; tag?: string }) => data)
  .handler(async ({ data }) => {
    await assertUnlocked();
    const { broadcastPush } = await import("@/lib/push-server");
    return await broadcastPush({
      title: String(data.title || "لوحة التحكم"),
      body: String(data.body || ""),
      url: data.url ?? "/ZGFzaGJvYXJk",
      tag: data.tag ?? `admin-${Date.now()}`,
    });
  });
