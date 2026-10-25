// Server-only helpers for Web Push. Never import from client code.
import { buildPushPayload } from "@block65/webcrypto-web-push";

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
};

export function getVapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"] ?? "";
  const privateKey = process.env["VAPID_PRIVATE_KEY"] ?? "";
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) throw new Error("VAPID keys not configured");
  return { publicKey, privateKey, subject };
}

export async function sendPushTo(
  sub: StoredSubscription,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number }> {
  const vapid = getVapid();
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
    expirationTime: null,
  };
  const built = await buildPushPayload(
    { data: JSON.stringify(payload), options: { ttl: 60, urgency: "high" } },
    subscription,
    { publicKey: vapid.publicKey, privateKey: vapid.privateKey, subject: vapid.subject },
  );
  const res = await fetch(sub.endpoint, built);
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status };
}

export async function broadcastPush(payload: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as never as {
    from: (t: string) => {
      select: (c: string) => Promise<{ data: StoredSubscription[] | null }>;
    };
  })
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, device_label");
  const rows = data ?? [];
  const stale: string[] = [];
  await Promise.all(
    rows.map(async (row) => {
      const r = await sendPushTo(row, payload);
      if (!r.ok) {
        if (r.status === 404 || r.status === 410) stale.push(row.id);
        else {
          await (supabaseAdmin as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: unknown) => Promise<unknown> } } })
            .from("push_subscriptions")
            .update({ last_failure_at: new Date().toISOString(), failure_count: 1 })
            .eq("id", row.id);
        }
      } else {
        await (supabaseAdmin as never as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: unknown) => Promise<unknown> } } })
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", row.id);
      }
    }),
  );
  if (stale.length > 0) {
    await (supabaseAdmin as never as { from: (t: string) => { delete: () => { in: (c: string, v: string[]) => Promise<unknown> } } })
      .from("push_subscriptions")
      .delete()
      .in("id", stale);
  }
  return { sent: rows.length - stale.length, removed: stale.length };
}
