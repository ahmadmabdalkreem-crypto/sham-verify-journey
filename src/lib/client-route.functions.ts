import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  email: z.string().trim().toLowerCase().optional().nullable(),
  sessionId: z.string().trim().optional().nullable(),
});

export type ClientRouteRow = {
  route: string | null;
  note: string | null;
  updated_at: string | null;
};

export const getClientRoute = createServerFn({ method: "POST" })
  // Never throw on bad input — a rejected validator surfaces as a 500 and blanks the page.
  .inputValidator((data: unknown) => {
    const r = Input.safeParse(data);
    return r.success ? r.data : { email: null, sessionId: null };
  })
  .handler(async ({ data }): Promise<{ email: ClientRouteRow | null; session: ClientRouteRow | null }> => {
    try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email && data.email.length > 0 ? data.email : null;
    const sessionId = data.sessionId && data.sessionId.length > 0 ? data.sessionId : null;

    let emailRow: ClientRouteRow | null = null;
    let sessionRow: ClientRouteRow | null = null;

    if (email) {
      const { data: row } = await supabaseAdmin
        .from("client_routes")
        .select("route, note, updated_at")
        .eq("email", email)
        .maybeSingle();
      emailRow = (row as ClientRouteRow | null) ?? null;
    }
    if (sessionId) {
      const { data: row } = await supabaseAdmin
        .from("session_routes")
        .select("route, note, updated_at")
        .eq("session_id", sessionId)
        .maybeSingle();
      sessionRow = (row as ClientRouteRow | null) ?? null;
    }
    return { email: emailRow, session: sessionRow };
    } catch (e) {
      console.error("[getClientRoute] failed:", e);
      return { email: null, session: null };
    }
  });
