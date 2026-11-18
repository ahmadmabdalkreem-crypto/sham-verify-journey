import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { setupOffline } from "@/lib/offline";
import { flushSubmissionQueue } from "@/lib/submissions";
import { OfflineBanner } from "@/components/offline-banner";
import { StaleSessionGuard } from "@/components/stale-session-guard";
import { useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { installTapHaptics } from "../lib/haptics";
import { ScrollChrome } from "../components/scroll-chrome";
import { OfficialChrome } from "../components/official-chrome";
import { RouteProgress } from "../components/route-progress";
import { RouteTransition } from "@/components/route-transition";
import { BlockGuard } from "@/components/block-guard";
import { ThemeToggle, themeInitScript } from "@/components/theme-toggle";

function NotFoundComponent() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <p className="text-sm text-muted-foreground">جارٍ التحويل إلى الصفحة الرئيسية…</p>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          تعذّر تحميل هذه الصفحة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو العودة للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="btn-shine inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" },
      { title: "بوابة خدمات شام كاش" },
      {
        name: "description",
        content: "بوابة توثيق حسابات شام كاش: تقديم طلبات التوثيق ومتابعة حالتها بأمان.",
      },
      { name: "author", content: "Sham Cash" },
      { property: "og:title", content: "بوابة خدمات شام كاش" },
      {
        property: "og:description",
        content: "قدّم طلب توثيق حسابك وتابع حالته عبر بوابة شام كاش الآمنة.",
      },
      { property: "og:locale", content: "ar_AR" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "شام كاش" },
      { property: "fb:app_id", content: "934850209356808" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "theme-color", content: "#0d1117" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "ShamCash" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png?v=4", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://shamcashappsy.com/#org",
              name: "شام كاش",
              alternateName: "Sham Cash",
              url: "https://shamcashappsy.com/",
              logo: "https://shamcashappsy.com/apple-touch-icon.png",
            },
            {
              "@type": "WebSite",
              "@id": "https://shamcashappsy.com/#website",
              name: "شام كاش",
              url: "https://shamcashappsy.com/",
              inLanguage: "ar",
              publisher: { "@id": "https://shamcashappsy.com/#org" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body className="w-full">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => installTapHaptics(), []);
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    // publish keyboard height as --kb so sticky/fixed CTAs can lift above it
    const update = () => {
      if (!vv) return;
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb", kb + "px");
      root.classList.toggle("kb-open", kb > 80);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);

    // keep focused field (and its form's submit button when it fits) visible above the keyboard (Safari)
    const keepVisible = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const vh = vv?.height ?? window.innerHeight;
      const r = el.getBoundingClientRect();
      const submit = el.closest("form")?.querySelector<HTMLElement>('button[type="submit"], button:not([type])');
      const sr = submit?.getBoundingClientRect();
      // fit field + submit together if they span less than the visible area
      if (sr && sr.bottom > r.bottom && sr.bottom - r.top < vh - 32) {
        if (r.top < 8 || sr.bottom > vh - 12) window.scrollBy({ top: sr.bottom - vh + 16, behavior: "smooth" });
        return;
      }
      if (r.top < 8 || r.bottom > vh - 24) el.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    const focusTimers = new Set<ReturnType<typeof setTimeout>>();
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      for (const delay of [120, 400]) {
        const timer = setTimeout(() => { focusTimers.delete(timer); keepVisible(); }, delay);
        focusTimers.add(timer);
      }
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const onVvResize = () => { clearTimeout(t); t = setTimeout(keepVisible, 80); };
    vv?.addEventListener("resize", onVvResize);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("focusin", onFocus);
      vv?.removeEventListener("resize", onVvResize);
      clearTimeout(t);
      focusTimers.forEach(clearTimeout);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.classList.remove("kb-open");
    };
  }, []);
  useEffect(() => {
    setupOffline();
    void flushSubmissionQueue();
    const sync = () => { void queryClient.invalidateQueries(); void flushSubmissionQueue(); };
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [queryClient]);

  // تحضير صفحات خطوات العميل بوقت الفراغ حتى تفتح الخطوة التالية فوراً
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (path.startsWith("/ZGFzaGJvYXJk")) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    const steps = ["/YXV0aA", "/b3Rw", "/cGVuZGluZw", "/dmVyaWZ5", "/cmV2aWV3", "/bG9nb3V0LWRldmljZXM", "/c3VjY2Vzcw"];
    const run = () => {
      for (const to of steps) if (to !== path) void Promise.resolve(router.preloadRoute({ to: to as "/" })).catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(run) : window.setTimeout(run, 1500);
    return () => { if (!w.requestIdleCallback) clearTimeout(id); };
  }, [router, path]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <RouteProgress />
      <BlockGuard />
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>

        <OfflineBanner />
        <StaleSessionGuard />
        <ScrollChrome />
        <OfficialChrome />
        <ThemeToggle />
      </div>
    </QueryClientProvider>
  );
}


