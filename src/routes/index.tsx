import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Apple, Smartphone, Share, PlusSquare, ShieldCheck, Zap, ArrowLeft, Download, CheckCircle2, X, Copy, ExternalLink, Chrome } from "lucide-react";
import { useEffect, useState } from "react";
import shamLogo from "@/assets/sham-login-logo.webp";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const OG_IMAGE = "https://shamcashappsy.com/og-share-v4.jpg?v=5";
const TITLE = "شام كاش سوريا | سجّل دخولك الآن مباشرة من الموقع — آيفون وأندرويد";
const DESCRIPTION = "إعلان رسمي: صار بإمكانك استخدام شام كاش مباشرة من المتصفح على آيفون وأندرويد بدون متجر تطبيقات. سجّل دخولك الآن وأضف الموقع لشاشتك الرئيسية ليعمل كتطبيق كامل.";
const SITE_URL = "https://shamcashappsy.com/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://shamcashappsy.com/" },
      { property: "og:site_name", content: "شام كاش سوريا" },
      { property: "og:locale", content: "ar_SY" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:alt", content: "شام كاش سوريا — سجّل دخولك مباشرة من الموقع" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://shamcashappsy.com/" },
      { rel: "preload", as: "image", href: shamLogo, fetchPriority: "high" },
    ],
  }),
  component: Splash,
});

type Platform = "ios" | "android" | "other";

function useDevice() {
  const [info, setInfo] = useState<{ platform: Platform; inApp: boolean; iosBrowser: "safari" | "chrome" | "other"; iPad: boolean }>({ platform: "other", inApp: false, iosBrowser: "safari", iPad: false });
  useEffect(() => {
    const ua = navigator.userAgent;
    const platform: Platform =
      /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && "ontouchend" in document)
        ? "ios"
        : /Android/.test(ua)
        ? "android"
        : "other";
    const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|Twitter|TikTok|musical_ly|BytedanceWebview|WhatsApp|Snapchat|MicroMessenger|Telegram|GSA\//i.test(ua);
    const iosBrowser = /CriOS/.test(ua) ? "chrome" : /FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/.test(ua) ? "other" : "safari";
    const iPad = !/iPhone|iPod/.test(ua) && (/iPad/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document));
    setInfo({ platform, inApp, iosBrowser, iPad });
  }, []);
  return info;
}

function Splash() {
  usePresenceTracker({ page: "/" });
  useAdminRedirect();
  const { platform, inApp, iosBrowser, iPad } = useDevice();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [sheet, setSheet] = useState<null | "ios" | "android" | "inapp">(null);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    // Installed app users skip the ad and go straight to sign-in.
    if (standalone) { navigate({ to: "/YXV0aA", replace: true }); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setSheet(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheet]);

  const onInstallClick = async () => {
    if (inApp) { setSheet("inapp"); return; }
    if (deferred) {
      try { await deferred.prompt(); await deferred.userChoice.catch(() => null); }
      finally { setDeferred(null); }
      return;
    }
    if (platform === "ios") { setSheet("ios"); return; }
    setSheet("android");
  };

  const copyLink = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(SITE_URL); ok = true; } catch {
      try {
        const t = document.createElement("textarea");
        t.value = SITE_URL; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select(); t.setSelectionRange(0, SITE_URL.length);
        ok = document.execCommand("copy"); t.remove();
      } catch { /* no-op */ }
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  const openInBrowser = () => {
    const host = SITE_URL.replace(/^https?:\/\//, "");
    if (platform === "android") {
      // intent URL opens Chrome directly from in-app browsers
      window.location.href = `intent://${host}#Intent;scheme=https;package=com.android.chrome;end`;
    } else if (platform === "ios") {
      // iOS 17+ honours x-safari-https from in-app browsers; copy as a fallback
      copyLink();
      window.location.href = `x-safari-https://${host}`;
    } else {
      copyLink();
    }
  };

  const ctaLabel = installed
    ? "التطبيق مثبّت"
    : inApp
    ? "افتح في المتصفح للتثبيت"
    : deferred
    ? "ثبّت التطبيق بضغطة"
    : platform === "ios"
    ? "ثبّت التطبيق على الآيفون"
    : platform === "android"
    ? "ثبّت التطبيق على أندرويد"
    : "ثبّت التطبيق على شاشتك";

  if (installed) return <main className="splash min-h-dvh" aria-busy="true" />;

  return (
    <main dir="rtl" lang="ar" className="splash splash-main relative flex min-h-dvh flex-col items-center justify-center overflow-hidden text-center">
      <div className="splash-glow" aria-hidden />
      <div className="splash-orb splash-orb-1" aria-hidden />
      <div className="splash-orb splash-orb-2" aria-hidden />
      <div className="splash-grain" aria-hidden />

      {inApp ? (
        <div className="inapp-banner reveal-up">
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-right text-[13px] font-bold leading-5">
            أنت تتصفّح من داخل تطبيق — افتح الموقع في {platform === "ios" ? "Safari" : "Chrome"} ليعمل التثبيت وتسجيل الدخول بشكل كامل.
          </span>
          <button
            type="button"
            onClick={openInBrowser}
            className="shrink-0 rounded-full bg-warning px-3 py-1.5 text-[12px] font-black text-background"
          >
            افتح المتصفح
          </button>
        </div>
      ) : null}



      <span className="splash-badge reveal-up">
        <span className="splash-badge-dot" aria-hidden />
        <Zap className="size-4 shrink-0" aria-hidden />
        إعلان رسمي · متاح الآن لجميع الأجهزة
      </span>

      <div className="splash-logo-wrap splash-gap-lg reveal-up" style={{ animationDelay: ".05s" }}>
        <div className="splash-logo-ring" aria-hidden />
        <div className="splash-logo-ring splash-logo-ring-2" aria-hidden />
        <img
          src={shamLogo}
          alt="شام كاش"
          width={112}
          height={112}
          fetchPriority="high"
          className="splash-logo size-24 rounded-3xl object-contain sm:size-28"
        />
      </div>

      <h1 className="splash-gap-md max-w-[22ch] text-balance text-[clamp(1.6rem,6.5vw,2.6rem)] font-black leading-[1.2] text-foreground reveal-up" style={{ animationDelay: ".1s" }}>
        شام كاش معك أينما كنت —{" "}
        <span className="splash-gold">سجّل دخولك الآن مباشرة عبر الموقع!</span>
      </h1>

      <p className="splash-gap-sm max-w-[34ch] text-balance text-[15px] leading-7 text-muted-foreground sm:text-base reveal-up" style={{ animationDelay: ".15s" }}>
        ثبّت التطبيق على شاشتك بضغطة واحدة — نفس الخدمات، نفس الأمان، بدون متجر.
      </p>

      <div className="splash-gap-sm flex flex-wrap items-center justify-center gap-2 reveal-up" style={{ animationDelay: ".2s" }}>
        <span className="splash-chip"><ShieldCheck className="size-3.5" aria-hidden /> اتصال مشفّر</span>
        <span className="splash-chip"><Zap className="size-3.5" aria-hidden /> فتح فوري</span>
        <span className="splash-chip"><Download className="size-3.5" aria-hidden /> بدون متجر</span>
      </div>

      <div className="splash-gap-md grid w-full max-w-sm grid-cols-2 gap-3 reveal-up" style={{ animationDelay: ".25s" }}>
        <PlatformCard icon={<Apple className="size-5" aria-hidden />} name="iPhone" sub="عبر Safari" active={platform === "ios"} />
        <PlatformCard icon={<Smartphone className="size-5" aria-hidden />} name="Android" sub="عبر Chrome" active={platform === "android"} />
      </div>

      {installed ? (
        <div className="splash-gap-lg flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 px-6 text-sm font-black text-success">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          التطبيق مثبّت على جهازك
        </div>
      ) : (
        <button
          type="button"
          onClick={onInstallClick}
          className="splash-cta splash-cta-shine splash-gap-lg flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-6 text-base font-black reveal-up"
          style={{ animationDelay: ".3s" }}
        >
          <Download className="size-5 shrink-0" aria-hidden />
          {ctaLabel}
        </button>
      )}

      <Link
        to="/YXV0aA"
        className="splash-gap-xs flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-6 text-sm font-black text-foreground backdrop-blur"
      >
        تسجيل الدخول الآن
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
      </Link>

      <p className="splash-gap-xs flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
        اتصال مشفّر · الموقع الرسمي لشام كاش سوريا
      </p>


      {sheet ? (
        <InstallSheet
          kind={sheet}
          onClose={() => setSheet(null)}
          onCopy={copyLink}
          onOpenBrowser={openInBrowser}
          copied={copied}
          platform={platform}
          iosBrowser={iosBrowser}
          iPad={iPad}
        />
      ) : null}
    </main>
  );
}

function InstallSheet({
  kind, onClose, onCopy, onOpenBrowser, copied, platform, iosBrowser, iPad,
}: {
  kind: "ios" | "android" | "inapp";
  onClose: () => void;
  onCopy: () => void;
  onOpenBrowser: () => void;
  copied: boolean;
  platform: Platform;
  iosBrowser: "safari" | "chrome" | "other";
  iPad: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="install-sheet w-full max-w-md rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-right animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/20" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-foreground">
            {kind === "inapp" ? "افتح الموقع في المتصفح" : kind === "ios" ? "ثبّت على الآيفون بخطوة واحدة" : "ثبّت على أندرويد بخطوة واحدة"}
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-full p-1 text-foreground/70 hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        {kind === "ios" ? (
          <ol className="splash-steps mt-4 grid gap-2 rounded-2xl p-4 text-[14px] leading-7">
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">١</b>
              <span>اضغط زر المشاركة <Share className="inline size-4 text-warning" aria-hidden /> {iosBrowser === "safari" && !iPad ? "أسفل Safari (أو بجانب شريط العنوان)" : "أعلى الشاشة بجانب شريط العنوان"}</span>
            </li>
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">٢</b>
              <span>مرّر للأسفل واختر «إضافة إلى الشاشة الرئيسية» <PlusSquare className="inline size-4 text-warning" aria-hidden /></span>
            </li>
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">٣</b>
              <span>اضغط «إضافة» — بيفتح شام كاش كتطبيق كامل</span>
            </li>
          </ol>
        ) : null}

        {kind === "ios" && iosBrowser === "other" ? (
          <p className="mt-3 rounded-xl bg-warning/10 p-3 text-[13px] leading-6 text-foreground/90">إذا ما لقيت الخيار، افتح الموقع في Safari — التثبيت مضمون منه.</p>
        ) : null}

        {kind === "ios" && iosBrowser === "safari" && !iPad ? (
          <div className="relative mt-3 h-10">
            <div className="install-arrow" aria-hidden />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[12px] font-bold text-warning">↓ زر المشاركة أسفل الشاشة</span>
          </div>
        ) : null}

        {kind === "android" ? (
          <ol className="splash-steps mt-4 grid gap-2 rounded-2xl p-4 text-[14px] leading-7">
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">١</b>
              <span>افتح قائمة Chrome (⋮) أعلى الشاشة</span>
            </li>
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">٢</b>
              <span>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</span>
            </li>
            <li className="flex items-start gap-2 text-foreground/95">
              <b className="splash-step-n">٣</b>
              <span>اضغط «تثبيت» — بتصير أيقونة شام كاش على شاشتك</span>
            </li>
          </ol>
        ) : null}

        {kind === "inapp" ? (
          <>
            <p className="mt-3 text-[14px] leading-7 text-foreground/90">
              أنت تتصفح من داخل تطبيق آخر. لتثبيت شام كاش، افتح الموقع في {platform === "ios" ? "Safari" : "Chrome"} أولاً.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={onOpenBrowser}
                className="splash-cta flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black"
              >
                {platform === "ios" ? <Apple className="size-4" aria-hidden /> : <Chrome className="size-4" aria-hidden />}
                {platform === "ios" ? "انسخ الرابط وافتح Safari" : "افتح في Chrome"}
                <ExternalLink className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-5 text-sm font-bold text-foreground"
              >
                <Copy className="size-4" aria-hidden />
                {copied ? "تم النسخ ✓" : "انسخ رابط الموقع"}
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-5 text-sm font-black text-foreground"
          >
            فهمت، شكراً
          </button>
        )}
      </div>
    </div>
  );
}

function PlatformCard({ icon, name, sub, active }: { icon: React.ReactNode; name: string; sub: string; active: boolean }) {
  return (
    <div className="splash-card flex flex-col items-center gap-1 rounded-2xl px-3 py-4" data-active={active || undefined}>
      <span className="text-foreground">{icon}</span>
      <span className="text-sm font-black text-foreground">{name}</span>
      <span className="text-[11px] font-semibold text-muted-foreground">{sub}</span>
      {active ? <span className="mt-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">جهازك</span> : null}
    </div>
  );
}
