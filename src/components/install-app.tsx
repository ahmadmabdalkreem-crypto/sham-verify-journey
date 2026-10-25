import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, PlusSquare, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallApp({ className }: { className?: string } = {}) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showIOSHelp) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = triggerRef.current;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIOSHelp(false);
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [showIOSHelp]);

  if (installed || (!deferred && !isIOS)) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIOSHelp(true);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onClick}
        className={className ?? "mx-auto mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 text-[13px] font-semibold text-white/85 backdrop-blur-md transition hover:bg-white/10 active:scale-[0.98]"}
      >
        <Download className="size-4 text-accent" />
        تثبيت التطبيق على هاتفك
      </button>

      {showIOSHelp && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            ref={dialogRef}
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تثبيت شام كاش على الآيفون"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 text-right shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">تثبيت شام كاش على الآيفون</h3>
              <button type="button" aria-label="إغلاق" onClick={() => setShowIOSHelp(false)} className="text-white/60">
                <X className="size-5" />
              </button>
            </div>
            <ol className="mt-4 grid gap-3 text-sm leading-7 text-white/75">
              <li className="flex items-center gap-3">
                <Share className="size-5 shrink-0 text-accent" />
                اضغط زر المشاركة أسفل متصفح Safari.
              </li>
              <li className="flex items-center gap-3">
                <PlusSquare className="size-5 shrink-0 text-accent" />
                اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».
              </li>
            </ol>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
