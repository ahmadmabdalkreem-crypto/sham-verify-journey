import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppScreen } from "@/components/app-screen";
import { ShieldAlert, Clock, Lock, Repeat, ShieldCheck, Database } from "lucide-react";
import { StatusHero } from "@/components/status-hero";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useNavigationLock } from "@/lib/nav-lock";

const ATTEMPTS_LOCK_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/YXR0ZW1wdHM")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تم تجاوز عدد المحاولات — شام كاش" },
      { name: "description", content: "تم تجاوز عدد المحاولات المتكررة. حاول لاحقًا بعد 24 ساعة." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AttemptsPage,
});

function AttemptsPage() {
  useAdminRedirect();
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const key = "sham_attempts_lock_until";
    try {
      const cached = window.localStorage.getItem(key);
      const parsed = cached ? Number(cached) : NaN;
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        setLockUntil(parsed);
        return;
      }
      const until = Date.now() + ATTEMPTS_LOCK_MS;
      window.localStorage.setItem(key, String(until));
      setLockUntil(until);
    } catch {
      setLockUntil(Date.now() + ATTEMPTS_LOCK_MS);
    }
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  useNavigationLock("/YXR0ZW1wdHM", lockUntil);
  const remainingMs = lockUntil ? Math.max(0, lockUntil - now) : null;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const remainingLabel = remainingMs === null
    ? ""
    : `${pad(Math.floor(remainingMs / 3_600_000))}:${pad(Math.floor((remainingMs % 3_600_000) / 60_000))}:${pad(Math.floor((remainingMs % 60_000) / 1000))}`;
  return (
    <AppScreen width="sm" compactLogo>
      <div dir="rtl" className="flex min-w-0 flex-col items-center text-center">
        <StatusHero
          tone="warning"
          icon={ShieldAlert}
          stripLabel="موقوف مؤقتاً"
          title="تم تجاوز عدد المحاولات"
          subtitle="لقد تجاوزت عدد المحاولات المتكررة المسموح بها لحماية حسابك."
        />

        <div
          className="status-surface mt-5 w-full rounded-3xl p-4 text-center"
          style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.12), rgba(2,6,23,0.4))",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          <div className="flex items-center justify-center gap-2 text-amber-200">
            <Clock className="h-4 w-4" />
            <span className="text-[11px] font-bold">إعادة المحاولة متاحة بعد</span>
          </div>
          <div
            dir="ltr"
            className="mt-1 text-3xl font-bold tracking-wider"
            style={{
              backgroundImage: "linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {remainingLabel || "--:--:--"}
          </div>
          <div className="mt-1 text-[11px] text-amber-200/70">ساعة : دقيقة : ثانية</div>
        </div>


        <div
          className="status-surface mt-5 w-full rounded-3xl p-4 text-right sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(2,6,23,0.75) 100%)",
            border: "1px solid rgba(6,182,212,0.2)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-white">لماذا تظهر هذه الرسالة؟</h3>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-amber-200"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(6,182,212,0.14))",
                border: "1px solid rgba(251,191,36,0.35)",
              }}
            >
              ٣ أسباب
            </span>
          </div>

          <ol className="mt-4 space-y-3">
            {[
              { icon: Repeat, title: "محاولات متكررة", hint: "رصدنا محاولات دخول متتابعة خلال فترة قصيرة." },
              { icon: ShieldCheck, title: "إيقاف مؤقّت", hint: "تم إيقاف المحاولات حفاظاً على أمان حسابك." },
              { icon: Database, title: "بياناتك آمنة", hint: "لن تتأثر بياناتك أو طلبك السابق." },
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
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-cyan-200"
                    style={{
                      background: "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(15,23,42,0.6))",
                      border: "1px solid rgba(6,182,212,0.35)",
                      boxShadow: "0 0 20px -6px rgba(6,182,212,0.55)",
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

        <div className="pt-4 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-[11px] font-bold text-slate-400">
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          الصفحة مقفلة حتى انتهاء المهلة
        </div>
      </div>
    </AppScreen>
  );
}
