import { lazy, Suspense, useEffect, useRef, useState } from "react";

const PhoneSwapSimulator = lazy(() =>
  import("@/components/phone-swap-simulator").then((m) => ({ default: m.PhoneSwapSimulator })),
);

/** يحمّل هاتف تبديل العملة فقط عند اقتراب العميل منه بالتمرير */
export function LazyPhoneSwap() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window.IntersectionObserver !== "function") { setShow(true); return; }
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { setShow(true); io.disconnect(); }
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const placeholder = <div className="mx-auto aspect-[9/16] w-full max-w-[min(340px,calc(100vw-2rem))] rounded-[2.9rem] border border-border/40" />;
  return (
    <div ref={ref} className="w-full">
      {show ? <Suspense fallback={placeholder}><PhoneSwapSimulator /></Suspense> : placeholder}
    </div>
  );
}
