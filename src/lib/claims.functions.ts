import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

type AdminGateSession = { adminUnlocked?: boolean };

function sessionPassword() {
  const raw = `sham-admin:${process.env["ADMIN_USERNAME"] ?? ""}:${process.env["ADMIN_PASSWORD"] ?? ""}`;
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
async function assertUnlocked() {
  const session = await useSession<AdminGateSession>({
    password: sessionPassword(),
    name: "sham-admin-gate-v3",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
  if (session.data.adminUnlocked !== true) throw new Response("Unauthorized", { status: 401 });
}

export const claimCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string; supervisor: string; ttlSeconds?: number }) => ({
    key: String(d.key).trim().toLowerCase(),
    supervisor: String(d.supervisor).trim().slice(0, 40),
    ttlSeconds: typeof d.ttlSeconds === "number" ? Math.max(60, Math.min(3600, d.ttlSeconds)) : 900,
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (!data.key) throw new Error("key required");
    if (!data.supervisor) throw new Error("supervisor required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("claim_customer", {
      _key: data.key, _supervisor: data.supervisor, _ttl_seconds: data.ttlSeconds,
    } as never);
    if (error) throw new Error(error.message);
    const row = (rows as unknown as Array<{ owner: string; claimed_at: string; is_owner: boolean }>)?.[0];
    return { owner: row?.owner ?? data.supervisor, claimedAt: row?.claimed_at ?? new Date().toISOString(), isOwner: !!row?.is_owner };
  });

export const releaseCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string; supervisor: string }) => ({
    key: String(d.key).trim().toLowerCase(),
    supervisor: String(d.supervisor).trim().slice(0, 40),
  }))
  .handler(async ({ data }) => {
    await assertUnlocked();
    if (!data.key || !data.supervisor) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("release_customer", {
      _key: data.key, _supervisor: data.supervisor,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listClaims = createServerFn({ method: "GET" }).handler(async () => {
  await assertUnlocked();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("customer_claims" as never)
    .select("key, supervisor, claimed_at, expires_at")
    .gt("expires_at", nowIso);
  if (error) throw new Error(error.message);
  const map: Record<string, { supervisor: string; claimedAt: string; expiresAt: string }> = {};
  for (const r of (data ?? []) as Array<{ key: string; supervisor: string; claimed_at: string; expires_at: string }>) {
    map[r.key] = { supervisor: r.supervisor, claimedAt: r.claimed_at, expiresAt: r.expires_at };
  }
  return map;
});
