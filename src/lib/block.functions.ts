import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  email: z.string().trim().toLowerCase().optional().nullable(),
  sessionId: z.string().trim().optional().nullable(),
  reason: z.string().trim().max(300).optional().nullable(),
});

type Ident = { email: string | null; sessionId: string | null };

function clean(data: z.infer<typeof Input>): Ident {
  return {
    email: data.email && data.email.length > 0 ? data.email : null,
    sessionId: data.sessionId && data.sessionId.length > 0 ? data.sessionId : null,
  };
}

/** يتحقق من الحظر على الخادم (بالبريد أو معرّف الجهاز) ويربط المعرّفين معاً */
export const isClientBlocked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ blocked: boolean; reason: string | null }> => {
    const { email, sessionId } = clean(data);
    if (!email && !sessionId) return { blocked: false, reason: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const filters: string[] = [];
    if (email) filters.push(`email.eq.${email}`);
    if (sessionId) filters.push(`session_id.eq.${sessionId}`);

    const { data: rows } = await supabaseAdmin
      .from("blocked_clients")
      .select("email, session_id, reason")
      .or(filters.join(","))
      .limit(5);

    const list = rows ?? [];
    if (list.length === 0) return { blocked: false, reason: null };

    // ربط المعرّف الآخر بالحظر حتى يستمر على أي جهاز أو متصفح
    const hasEmail = email ? list.some((r) => r.email === email) : true;
    const hasSession = sessionId ? list.some((r) => r.session_id === sessionId) : true;
    const reason = list.find((r) => r.reason)?.reason ?? null;
    const extra: Array<{ email: string | null; session_id: string | null; reason: string | null }> = [];
    if (email && !hasEmail) extra.push({ email, session_id: null, reason });
    if (sessionId && !hasSession) extra.push({ email: null, session_id: sessionId, reason });
    if (extra.length > 0) {
      try { await supabaseAdmin.from("blocked_clients").insert(extra); } catch { /* ignore */ }
    }
    return { blocked: true, reason };
  });

/** يسجّل الحظر على الخادم ليستمر عبر الأجهزة */
export const recordClientBlock = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { email, sessionId } = clean(data);
    const reason = data.reason && data.reason.length > 0 ? data.reason : null;
    if (!email && !sessionId) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows: Array<{ email: string | null; session_id: string | null; reason: string | null }> = [];
    if (email) rows.push({ email, session_id: null, reason });
    if (sessionId) rows.push({ email: null, session_id: sessionId, reason });
    for (const row of rows) {
      const q = supabaseAdmin.from("blocked_clients").select("id").limit(1);
      const { data: found } = row.email
        ? await q.eq("email", row.email)
        : await q.eq("session_id", row.session_id!);
      if (!found || found.length === 0) {
        try { await supabaseAdmin.from("blocked_clients").insert(row); } catch { /* ignore */ }
      }
    }
    return { ok: true as const };
  });
