import { AlertTriangle, ArrowLeft, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Tone = "error" | "warning" | "info";

const TONES: Record<Tone, {
  ring: string; bg: string; stripe: string;
  icon: string; iconGlow: string;
  title: string; body: string;
  hintBg: string; hintText: string; hintIcon: string;
  bullet: string;
}> = {
  error: {
    ring: "ring-destructive/40",
    bg: "bg-gradient-to-br from-destructive/15 via-destructive/8 to-destructive/5",
    stripe: "bg-destructive",
    icon: "bg-destructive/20 text-destructive",
    iconGlow: "shadow-[0_0_24px_-4px] shadow-destructive/60",
    title: "text-destructive",
    body: "text-destructive-foreground/95",
    hintBg: "bg-destructive/10 ring-destructive/20",
    hintText: "text-destructive/90",
    hintIcon: "text-destructive",
    bullet: "text-destructive",
  },
  warning: {
    ring: "ring-amber-400/40",
    bg: "bg-gradient-to-br from-amber-400/15 via-amber-400/8 to-amber-400/5",
    stripe: "bg-amber-400",
    icon: "bg-amber-400/20 text-amber-300",
    iconGlow: "shadow-[0_0_24px_-4px] shadow-amber-400/60",
    title: "text-amber-200",
    body: "text-amber-50/95",
    hintBg: "bg-amber-400/10 ring-amber-400/20",
    hintText: "text-amber-100/90",
    hintIcon: "text-amber-300",
    bullet: "text-amber-300",
  },
  info: {
    ring: "ring-sky-400/40",
    bg: "bg-gradient-to-br from-sky-400/15 via-sky-400/8 to-sky-400/5",
    stripe: "bg-sky-400",
    icon: "bg-sky-400/20 text-sky-300",
    iconGlow: "shadow-[0_0_24px_-4px] shadow-sky-400/60",
    title: "text-sky-200",
    body: "text-sky-50/95",
    hintBg: "bg-sky-400/10 ring-sky-400/20",
    hintText: "text-sky-100/90",
    hintIcon: "text-sky-300",
    bullet: "text-sky-300",
  },
};

export function ErrorAlert({
  title,
  message,
  hint,
  items,
  tone = "error",
  icon: Icon = AlertTriangle,
  action,
  className = "",
}: {
  title?: string | undefined;
  message?: string | undefined;
  hint?: string | undefined;
  items?: string[] | undefined;
  tone?: Tone | undefined;
  icon?: LucideIcon | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  void TONES;
  const text = items && items.length > 0 ? title : message ?? title;
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(true); }, [text]);
  const showBanner = tone === "error" && !action && open && !!text;
  useEffect(() => {
    if (!showBanner) return;
    document.body.classList.add("has-error-banner");
    return () => document.body.classList.remove("has-error-banner");
  }, [showBanner]);
  if (tone === "error" && !action) {
    if (!open || !text || typeof document === "undefined") return null;
    return createPortal(
      <div
        role="alert"
        aria-live="assertive"
        className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="error-banner mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-4 text-right shadow-lg">
          <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full">
            <XCircle className="size-7" strokeWidth={1.8} />
          </button>
          <p className="min-w-0 flex-1 text-base font-semibold leading-6" style={{ overflowWrap: "anywhere" }}>{text}</p>
        </div>
      </div>,
      document.body,
    );
  }
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-tone={tone}
      className={`lv-alert lv-alert-enter relative mx-auto w-full max-w-sm overflow-hidden text-right ${className}`}
      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
    >
      <div className="lv-alert-head">
        <span className="lv-alert-icon lv-alert-badge"><Icon className="size-5" strokeWidth={2.3} /></span>
        <div className="min-w-0 flex-1">
          <div className="lv-alert-title">{title ?? (tone === "error" ? "حدث خطأ" : tone === "warning" ? "تنبيه" : "معلومة")}</div>
          {message ? <div className="lv-alert-msg">{message}</div> : null}
        </div>
      </div>
      {items && items.length > 0 ? (
        <ul className="lv-alert-list">
          {items.map((it) => (
            <li key={it}><span aria-hidden className="lv-alert-dot" /><span className="min-w-0 flex-1">{it}</span></li>
          ))}
        </ul>
      ) : null}
      {hint ? (
        <div className="lv-alert-hint">
          <span className="lv-alert-hint-label"><ArrowLeft className="size-3.5" strokeWidth={2.6} /> ماذا تفعل الآن؟</span>
          <span className="block">{hint}</span>
        </div>
      ) : null}
      {action ? <div className="px-4 pb-4">{action}</div> : null}
    </div>
  );
}
