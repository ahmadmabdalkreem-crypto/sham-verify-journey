import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollChrome() {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const y = h.scrollTop || document.body.scrollTop;
      setProgress(max > 0 ? y / max : 0);
      setShow(y > 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
        aria-label="العودة إلى الأعلى"
        className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-6 z-50 grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-background/70 text-foreground shadow-[0_10px_30px_rgb(0_0_0/0.45)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-accent/40 ${
          show ? "opacity-100 translate-y-0" : "pointer-events-none invisible opacity-0 translate-y-2"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </>
  );
}
