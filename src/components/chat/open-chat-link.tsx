import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle } from "lucide-react";
import { chatClientState } from "@/lib/chat.functions";
import { getSessionId } from "@/lib/session-id";
import { readClientEmail } from "@/lib/admin-redirect";

/** رابط أنيق لفتح دردشة جديدة مع الدعم. يختفي عند تعطيل الدردشة. */
export function OpenChatLink({ label = "ابدأ دردشة جديدة مع الدعم" }: { label?: string }) {
  const stateFn = useServerFn(chatClientState);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await stateFn({ data: { sessionId: getSessionId(), email: readClientEmail() } });
        if (alive) setEnabled(!!r.enabled);
      } catch {
        if (alive) setEnabled(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [stateFn]);

  if (!enabled) return null;

  return (
    <Link
      to="/Y2hhdA"
      className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-extrabold text-white transition hover:brightness-110"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(6,182,212,0.22))",
        border: "1px solid rgba(16,185,129,0.45)",
        boxShadow: "0 10px 24px -14px rgba(16,185,129,0.55)",
      }}
    >
      <MessageCircle className="h-5 w-5 text-emerald-300" />
      {label}
    </Link>
  );
}
