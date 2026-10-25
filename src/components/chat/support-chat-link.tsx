import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy } from "lucide-react";
import { chatClientState } from "@/lib/chat.functions";
import { getSessionId } from "@/lib/session-id";
import { readClientEmail } from "@/lib/admin-redirect";

/** سطر صغير أنيق: "ما زلت عالقاً؟ تواصل مع الدعم" يفتح دردشة. يختفي عند تعطيلها. */
export function SupportChatLink() {
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
    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
      <Link
        to="/Y2hhdA"
        className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:underline"
      >
        <LifeBuoy className="h-3.5 w-3.5" /> تواصل مع الدعم
      </Link>
    </div>
  );
}
