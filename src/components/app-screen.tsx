import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/lib/use-reveal";
import shamLogo from "@/assets/sham-login-logo.webp";
import { HomeShapes } from "@/components/home-shapes";

/** خطوط كنتورية منبعثة من أعلى المنتصف — نفس خلفية صفحة تسجيل الدخول */
export function WavesBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMin slice"
      viewBox="0 0 390 844"
      fill="none"
    >
      {Array.from({ length: 26 }).map((_, i) => {
        const y = -60 + i * 26;
        const depth = 150 + i * 14;
        const opacity = Math.max(0.08, 0.5 - i * 0.02);
        return (
          <path
            key={i}
            d={`M -60 ${y + depth} Q 195 ${y - 40} 450 ${y + depth}`}
            stroke="#1B2A4A"
            strokeOpacity={opacity}
            strokeWidth="1.1"
          />
        );
      })}
    </svg>
  );
}

export function PoweredByFooter({ className: _className }: { className?: string }) {
  return null;
}

type AppScreenProps = {
  children: ReactNode;
  /** رابط زر الرجوع في الأعلى */
  backTo?: string;
  /** عرض اللوحة الأقصى */
  width?: "sm" | "lg";
  className?: string;
  /** شكل تطبيق شام كاش الرسمي: خلفية مسطّحة دون بطاقة */
  plain?: boolean;
  /** شعار مصغّر وقريب من الأعلى (خطوة أمنية) */
  compactLogo?: boolean;
};

/**
 * الهيكل الموحّد لكل صفحات البوابة: خلفية كنتورية داكنة، شريط علوي،
 * الشعار في المنتصف، لوحة شفافة كبيرة، وتذييل POWERED BY.
 */
export function AppScreen({ children, backTo = "/", width = "sm", className, plain = true, compactLogo = false }: AppScreenProps) {
  useReveal();
  return (
    <div className={cn("noise-overlay relative min-h-screen min-h-dvh overflow-hidden bg-background pb-[env(safe-area-inset-bottom)]", plain && "app-plain", "brand-v4")}>
      <div aria-hidden className="home-v3 pointer-events-none !absolute inset-0 !z-0 overflow-hidden !bg-transparent">
        <HomeShapes />
      </div>

      <div className="official-in delay-o1 relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <Link
          to={backTo}
          aria-label="رجوع"
          className="relative flex size-11 shrink-0 active:scale-95 before:absolute before:-inset-0.5 before:content-[''] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white backdrop-blur-md transition hover:bg-white/10"
        >
          <ChevronLeft className="size-6 rtl:rotate-180" />
        </Link>
        <div className="trust-pill text-white/80">
          <span
            className="live-dot size-1.5 rounded-full bg-accent"
            style={{ boxShadow: "0 0 8px oklch(0.74 0.15 168)" }}
          />
          <span className="font-medium tracking-wide">الموقع الرسمي</span>
        </div>
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto flex min-h-[calc(100dvh-64px)] flex-col px-4 pb-10 sm:px-6",
          width === "lg" ? "max-w-6xl" : "max-w-md",
        )}
      >
        <div className={cn("official-in flex flex-col items-center", compactLogo ? "mt-2" : "mt-5 sm:mt-8")}>
          <Link to="/" className="float-soft">
            <img
              src={shamLogo}
              alt="شعار شام كاش"
              className={cn("w-auto drop-shadow-[0_16px_38px_rgba(74,144,226,0.45)]", compactLogo ? "h-10 sm:h-12" : "h-20 sm:h-24")}
            />
          </Link>
          <div className="relative mt-3">
            <span className="text-shimmer text-xl font-bold tracking-tight">شام كاش</span>
            <div
              className="absolute inset-x-0 -bottom-1 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, oklch(0.6 0.17 262), transparent)",
              }}
            />
          </div>
        </div>

        <div
          data-reveal=""
          className={cn(
            "official-in delay-o3 glass-premium noise-overlay surface-deep lift-hover mt-6 flex flex-col px-4 py-7 sm:mt-8 sm:px-9 sm:py-10",
            className,
          )}
        >
          <div className="relative z-10 flex flex-col">
            {children}
            <PoweredByFooter />
          </div>
        </div>

        <div className="official-in delay-o4 mt-8 flex flex-col items-center gap-3">
          <hr className="divider-glow w-40" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span data-reveal="" className="trust-pill text-white/65">تشفير طبقة النقل الآمنة</span>
            <span data-reveal="" className="trust-pill text-white/65">تشفير 256-بت</span>
            <span data-reveal="" className="trust-pill text-white/65">معايير اعرف عميلك</span>
          </div>
          <span className="text-xs font-medium tracking-[0.18em] text-white/35">
            محميّة بنظام حماية شام كاش
          </span>
        </div>
      </div>
    </div>
  );
}

