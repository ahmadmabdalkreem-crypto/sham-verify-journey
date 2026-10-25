import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Share, PlusSquare, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function HeaderInstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua));
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (installed || (!deferred && !isIOS)) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => null);
      setDeferred(null);
    } else if (isIOS) setOpen(true);
  };

  const steps = [
    { icon: <Share className="size-5" />, text: "اضغط على زر المشاركة (⎘) أسفل المتصفح" },
    { icon: <PlusSquare className="size-5" />, text: "مرّر واختر «إضافة إلى الشاشة الرئيسية»" },
    { icon: <Download className="size-5" />, text: "اضغط «إضافة»" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="تثبيت التطبيق"
        title="تثبيت التطبيق"
        className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 text-[#ff6b00] transition active:scale-95 hover:bg-white/5"
      >
        <Download className="size-5" />
      </button>
      {open && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 font-[Cairo] sm:items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="تثبيت التطبيق" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#060b14] p-5 text-white shadow-2xl mb-[env(safe-area-inset-bottom)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">تثبيت التطبيق على الآيفون</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="grid size-11 place-items-center rounded-xl hover:bg-white/5 active:scale-95">
                <X className="size-5" />
              </button>
            </div>
            <ol className="space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#ff6b00]/15 text-[#ff6b00]">{s.icon}</span>
                  <span><b className="text-[#ff6b00]">{i + 1}.</b> {s.text}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setOpen(false)} className="mt-5 min-h-11 w-full rounded-xl bg-[#ff6b00] font-bold text-white active:scale-95">حسنًا</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
