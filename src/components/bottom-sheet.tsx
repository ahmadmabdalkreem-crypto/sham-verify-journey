import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * نافذة سفلية للهاتف (< 1024px) مع السحب للإغلاق ونقطتي توقف (60٪ / 90٪).
 * على الكمبيوتر (≥ 1024px) تظهر كنافذة وسط الشاشة كما هي.
 */
export function BottomSheet({
  open, onClose, label, children, initialSnap = "half", desktopClassName = "max-w-md",
  desktopPanelClassName, fullScreen = false, markPopover = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  initialSnap?: "half" | "full";
  desktopClassName?: string;
  /** يستبدل تنسيق صندوق الكمبيوتر بالكامل */
  desktopPanelClassName?: string;
  /** على الهاتف: ملء الشاشة بدون نقاط توقف */
  fullScreen?: boolean;
  /** يضع data-panel-popover-open (يوقف اختصارات اللوحة) */
  markPopover?: boolean;
}) {
  const pop = markPopover ? { "data-panel-popover-open": "" } : {};
  const [snap, setSnap] = useState<"half" | "full">(initialSnap);
  const [dragY, setDragY] = useState(0);
  const [entered, setEntered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; t: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!open) { setEntered(false); return; }
    setSnap(initialSnap);
    setDragY(0);
    const id = requestAnimationFrame(() => setEntered(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", k, true);
    };
  }, [open, initialSnap, onClose]);

  if (!open || typeof document === "undefined") return null;

  if (isDesktop) {
    return createPortal(
      <div dir="rtl" {...pop} role="dialog" aria-modal="true" aria-label={label}
        className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
        <div className={desktopPanelClassName ?? `w-full rounded-2xl bg-white p-4 text-slate-800 shadow-2xl ${desktopClassName}`} onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    setDragY(Math.max(dy, -window.innerHeight * 0.3));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    const v = dy / Math.max(1, performance.now() - drag.current.t); // px/ms
    drag.current = null;
    setDragging(false);
    setDragY(0);
    if (dy > 80 || v > 0.5) {
      if (fullScreen) { if (dy > 160 || v > 1.2) onClose(); return; }
      if (snap === "full" && dy < 250 && v <= 1.2) setSnap("half");
      else onClose();
    } else if (dy < -60 || v < -0.5) {
      setSnap("full");
    }
  };

  const height = fullScreen ? "100dvh" : snap === "full" ? "90dvh" : "60dvh";

  return createPortal(
    <div dir="rtl" {...pop} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ease-out ${entered ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col ${fullScreen ? "" : "rounded-t-3xl"} bg-white text-slate-800 shadow-2xl`}
        style={{
          height,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transform: entered ? `translateY(${dragY}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 200ms ease-out, height 200ms ease-out",
        }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${fullScreen ? "" : "px-4 pb-4"}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
