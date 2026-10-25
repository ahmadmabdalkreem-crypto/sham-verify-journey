import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export type StatusTone = "success" | "pending" | "warning" | "danger";

type ToneSpec = {
  ringA: string;
  ringB: string;
  haloBg: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  iconShadow: string;
  stripBg: string;
  stripBorder: string;
  stripColor: string;
  stripShadow: string;
  dot: string;
  titleGradient: string;
};

const TONES: Record<StatusTone, ToneSpec> = {
  success: {
    ringA: "rgba(16,185,129,0.35)",
    ringB: "rgba(16,185,129,0.18)",
    haloBg: "rgba(16,185,129,0.18)",
    iconBg: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
    iconBorder: "rgba(16,185,129,0.65)",
    iconColor: "#ffffff",
    iconShadow: "0 0 55px rgba(16,185,129,0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
    stripBg: "linear-gradient(90deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))",
    stripBorder: "rgba(16,185,129,0.6)",
    stripColor: "#ffffff",
    stripShadow: "0 10px 30px -10px rgba(16,185,129,0.55)",
    dot: "#86efac",
    titleGradient: "linear-gradient(135deg,#ffffff 0%,#86efac 50%,#10b981 100%)",
  },
  pending: {
    ringA: "rgba(14,165,233,0.4)",
    ringB: "rgba(14,165,233,0.18)",
    haloBg: "rgba(14,165,233,0.18)",
    iconBg: "linear-gradient(135deg,#38bdf8 0%,#0284c7 100%)",
    iconBorder: "rgba(56,189,248,0.65)",
    iconColor: "#ffffff",
    iconShadow: "0 0 55px rgba(14,165,233,0.6), inset 0 1px 0 rgba(255,255,255,0.35)",
    stripBg: "linear-gradient(90deg, rgba(14,165,233,0.95), rgba(2,132,199,0.95))",
    stripBorder: "rgba(56,189,248,0.6)",
    stripColor: "#ffffff",
    stripShadow: "0 10px 30px -10px rgba(14,165,233,0.55)",
    dot: "#bae6fd",
    titleGradient: "linear-gradient(135deg,#ffffff 0%,#7dd3fc 50%,#0ea5e9 100%)",
  },
  warning: {
    ringA: "rgba(245,158,11,0.4)",
    ringB: "rgba(245,158,11,0.18)",
    haloBg: "rgba(245,158,11,0.18)",
    iconBg: "linear-gradient(135deg,#fbbf24 0%,#d97706 100%)",
    iconBorder: "rgba(251,191,36,0.7)",
    iconColor: "#422006",
    iconShadow: "0 0 55px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.5)",
    stripBg: "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))",
    stripBorder: "rgba(251,191,36,0.65)",
    stripColor: "#1f1300",
    stripShadow: "0 10px 30px -10px rgba(245,158,11,0.55)",
    dot: "#fde68a",
    titleGradient: "linear-gradient(135deg,#ffffff 0%,#fde68a 50%,#f59e0b 100%)",
  },
  danger: {
    ringA: "rgba(239,68,68,0.4)",
    ringB: "rgba(239,68,68,0.18)",
    haloBg: "rgba(239,68,68,0.18)",
    iconBg: "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
    iconBorder: "rgba(248,113,113,0.7)",
    iconColor: "#ffffff",
    iconShadow: "0 0 55px rgba(239,68,68,0.6), inset 0 1px 0 rgba(255,255,255,0.3)",
    stripBg: "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(185,28,28,0.95))",
    stripBorder: "rgba(248,113,113,0.6)",
    stripColor: "#ffffff",
    stripShadow: "0 10px 30px -10px rgba(239,68,68,0.55)",
    dot: "#fecaca",
    titleGradient: "linear-gradient(135deg,#ffffff 0%,#fecaca 50%,#ef4444 100%)",
  },
};

type Props = {
  tone: StatusTone;
  icon: LucideIcon;
  stripLabel: string;
  title: string;
  subtitle?: ReactNode;
  spin?: boolean;
};

export function StatusHero({ tone, icon: Icon, stripLabel, title, subtitle, spin }: Props) {
  const t = TONES[tone];

  const stripStyle: CSSProperties = {
    background: t.stripBg,
    border: `1.5px solid ${t.stripBorder}`,
    color: t.stripColor,
    boxShadow: t.stripShadow,
  };

  const iconWrapStyle: CSSProperties = {
    background: t.iconBg,
    border: `2px solid ${t.iconBorder}`,
    color: t.iconColor,
    boxShadow: t.iconShadow,
  };

  const titleStyle: CSSProperties = {
    backgroundImage: t.titleGradient,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  return (
    <div className="flex w-full flex-col items-center text-center">
      {/* Colored status strip */}
      <div
        className="status-strip mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold tracking-wide"
        style={stripStyle}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: t.dot, boxShadow: `0 0 10px ${t.dot}` }}
        />
        {stripLabel}
      </div>

      {/* Big status badge */}
      <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
        <span
          className="absolute inset-0 animate-ping rounded-full"
          style={{ border: `2px solid ${t.ringA}` }}
        />
        <span
          className="absolute inset-3 rounded-full"
          style={{ background: t.haloBg }}
        />
        <div
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full ${spin ? "" : ""}`}
          style={iconWrapStyle}
        >
          <Icon className={`h-10 w-10 ${spin ? "animate-spin" : ""}`} strokeWidth={2.4} />
        </div>
      </div>

      <h1
        className="status-title mt-5 text-[26px] font-extrabold leading-tight tracking-tight sm:text-[28px]"
        style={titleStyle}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="status-sub mx-auto mt-2 max-w-sm text-[13px] font-medium leading-7 text-slate-200">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
