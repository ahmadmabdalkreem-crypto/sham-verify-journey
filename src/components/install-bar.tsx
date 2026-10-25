import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Download, Share, PlusSquare } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "pwa_install_dismissed";

/** شريط سفلي للهاتف يقترح تثبيت التطبيق. يختفي إذا كان مثبّتاً أو بعد الإخفاء. */
export function InstallBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* ignore */
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);
    setHidden(dismissed || standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // لا يظهر في لوحات الإدارة (حيث يوجد شريط القرارات السفلي)
  const onAdminArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/ZGFzaGJvYXJk");

  if (hidden || onAdminArea) return null;
  if (!isIOS && !deferred) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setHidden(true);
    } catch {
      /* ignore */
    }
    setDeferred(null);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-x-3 bottom-3 z-50 lg:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="rounded-2xl border border-white/10 bg-brand-deep/95 p-3 shadow-2xl backdrop-blur">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
              <Download className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-white">ثبّت تطبيق شام كاش</p>
              {isIOS && !deferred ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] leading-tight text-white/70">
                  اضغط
                  <Share className="inline size-3 shrink-0" aria-hidden />
                  مشاركة ثم
                  <PlusSquare className="inline size-3 shrink-0" aria-hidden />
                  إضافة إلى الشاشة الرئيسية
                </p>
              ) : (
                <p className="truncate text-[11px] leading-tight text-white/70">
                  وصول أسرع من شاشة هاتفك
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => (deferred ? void install() : setSteps((v) => !v))}
              aria-expanded={deferred ? undefined : steps}
              className="min-h-11 rounded-xl bg-warning px-4 text-sm font-bold text-warning-foreground shadow-lg active:scale-95"
            >
              {deferred ? "تثبيت الآن" : steps ? "إغلاق" : "كيف أثبّته؟"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="إخفاء اقتراح التثبيت"
              className="min-h-11 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white/80"
            >
              إخفاء
            </button>
          </div>
        </div>
        {steps && isIOS && !deferred ? (
          <ol className="mt-3 grid gap-2 border-t border-white/10 pt-3 text-[13px] leading-6 text-white/90">
            <li className="flex items-center gap-2"><b className="text-warning">1.</b> اضغط زر المشاركة <Share className="inline size-4 shrink-0 text-warning" aria-hidden /> أسفل Safari</li>
            <li className="flex items-center gap-2"><b className="text-warning">2.</b> اختر «إضافة إلى الشاشة الرئيسية» <PlusSquare className="inline size-4 shrink-0 text-warning" aria-hidden /></li>
            <li className="flex items-center gap-2"><b className="text-warning">3.</b> اضغط «إضافة» — يظهر شام كاش كتطبيق على شاشتك</li>
          </ol>
        ) : null}
      </div>
    </div>
  );
}
