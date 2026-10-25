import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppScreen } from "@/components/app-screen";
import { Lock, Mail, FileText, ShieldX, Ban } from "lucide-react";
import { StatusHero } from "@/components/status-hero";
import { useNavigationLock } from "@/lib/nav-lock";
import { BLOCK_FLAG } from "@/components/block-guard";
import { isClientBlocked } from "@/lib/block.functions";
import { getSessionId } from "@/lib/session-id";

export const Route = createFileRoute("/YmxvY2tlZA")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تم حظر الحساب — شام كاش" },
      { name: "description", content: "تم حظر هذا الحساب من الوصول إلى الموقع." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BlockedPage,
});

// حظر دائم: نقفل الصفحة لعشر سنوات ونثبّت العلم محليًا.
const PERMANENT_LOCK = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;

function BlockedPage() {
  const [confirmed, setConfirmed] = useState(false);
  // الخادم وحده يقرّر الحظر: مجرد فتح هذا الرابط لا يحظر أحداً.
  useEffect(() => {
    let alive = true;
    let email: string | null = null;
    try {
      const v = window.localStorage.getItem("sham_email");
      email = v && v.trim() ? v.trim().toLowerCase() : null;
    } catch { /* ignore */ }
    void isClientBlocked({ data: { email, sessionId: getSessionId() } })
      .then((res) => {
        if (!alive) return;
        if (res.blocked) {
          try { window.localStorage.setItem(BLOCK_FLAG, "1"); } catch { /* ignore */ }
          setConfirmed(true);
          return;
        }
        try { window.localStorage.removeItem(BLOCK_FLAG); } catch { /* ignore */ }
        window.location.replace("/");
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);
  useNavigationLock("/YmxvY2tlZA", confirmed ? PERMANENT_LOCK : null);
  return (
    <AppScreen width="sm" compactLogo>
      <div dir="rtl" className="flex flex-col items-center text-center text-white">
        <StatusHero
          tone="danger"
          icon={Ban}
          stripLabel="تم الحظر نهائياً"
          title="تم حظر حسابك"
          subtitle="تم حظر هذا الحساب من الوصول إلى الموقع بشكل نهائي بناءً على مراجعة الإدارة."
        />

        <div
          className="status-surface mt-5 w-full rounded-3xl p-4 text-right sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(2,6,23,0.75) 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-white">خطوات التواصل مع الدعم</h3>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-amber-200"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(239,68,68,0.14))",
                border: "1px solid rgba(251,191,36,0.35)",
              }}
            >
              ٣ خطوات
            </span>
          </div>

          <ol className="mt-4 space-y-3">
            {[
              { icon: Mail, title: "راسل البريد الرسمي", hint: "تواصل مع فريق الدعم عبر البريد الرسمي للمنصّة." },
              { icon: FileText, title: "اذكر بياناتك", hint: "ضمّن الرسالة بياناتك المسجّلة لتسريع المراجعة." },
              { icon: ShieldX, title: "لا تُعِد المحاولة", hint: "الوصول مغلق بشكل نهائي حتى الردّ من الإدارة." },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={i}
                  className="status-nested flex items-start gap-3 rounded-2xl p-3.5"
                  style={{
                    background: "linear-gradient(180deg, rgba(15,23,42,0.6), rgba(2,6,23,0.4))",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-red-200"
                    style={{
                      background: "linear-gradient(135deg, rgba(239,68,68,0.22), rgba(15,23,42,0.6))",
                      border: "1px solid rgba(239,68,68,0.35)",
                      boxShadow: "0 0 20px -6px rgba(239,68,68,0.55)",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                    <span
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold text-slate-900"
                      style={{
                        background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      }}
                    >
                      {["١", "٢", "٣"][i]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-[15px] font-extrabold leading-snug text-white">{step.title}</p>
                    <p className="mt-1 text-[13px] leading-6 text-slate-300">{step.hint}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </AppScreen>
  );
}
