import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  sessionId: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().toLowerCase().max(320).optional().nullable(),
});

/** Read-only: does this browser's session/email still have any entry in the database? */
export const checkSessionAlive = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ alive: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sid = data.sessionId || null;
    const email = data.email || null;
    if (!sid && !email) return { alive: true };
    try {
      if (sid) {
        const { count, error } = await supabaseAdmin
          .from("client_submissions")
          .select("id", { count: "exact", head: true })
          .eq("payload->>session_id", sid);
        if (error) return { alive: true };
        if ((count ?? 0) > 0) return { alive: true };
      }
      if (email) {
        const { count, error } = await supabaseAdmin
          .from("client_submissions")
          .select("id", { count: "exact", head: true })
          .ilike("email", email);
        if (error) return { alive: true };
        if ((count ?? 0) > 0) return { alive: true };
      }
      return { alive: false };
    } catch {
      // Never kick a customer out because of a network/database hiccup.
      return { alive: true };
    }
  });
