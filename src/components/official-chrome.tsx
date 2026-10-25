import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** خط «اتصال آمن» علوي + شريط تقدّم أثناء التنقل + تموّج الأزرار + مؤشر ذهبي (سطح المكتب). */
export function OfficialChrome() {
  const loading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [bar, setBar] = useState<{ p: number; on: boolean }>({ p: 0, on: false });
  const dot = useRef<HTMLDivElement>(null);
  const trail = useRef<(HTMLDivElement | null)[]>([]);
  const [cursorOn, setCursorOn] = useState(false);

  // شريط تقدّم التنقل
  useEffect(() => {
    let t: number | undefined;
    if (loading) {
      setBar({ p: 0.15, on: true });
      t = window.setInterval(() => setBar((b) => ({ on: true, p: Math.min(0.9, b.p + (0.9 - b.p) * 0.2) })), 120);
    } else {
      setBar((b) => (b.on ? { on: true, p: 1 } : b));
      t = window.setTimeout(() => setBar({ p: 0, on: false }), 320) as unknown as number;
    }
    return () => { window.clearInterval(t); window.clearTimeout(t); };
  }, [loading]);

  // وميض قصير عند كل تغيير مسار
  useEffect(() => {
    setBar({ p: 0.6, on: true });
    const a = window.setTimeout(() => setBar({ p: 1, on: true }), 150);
    const b = window.setTimeout(() => setBar({ p: 0, on: false }), 450);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [path]);

  // تموّج الأزرار
  useEffect(() => {
    if (reduced()) return;
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("button, a[href], [role='button']") as HTMLElement | null;
      if (!el || el.closest(".admin-light")) return;
      const r = el.getBoundingClientRect();
      const s = document.createElement("span");
      const size = Math.max(r.width, r.height);
      s.className = "official-ripple";
      s.style.width = s.style.height = `${size}px`;
      s.style.left = `${e.clientX - r.left - size / 2}px`;
      s.style.top = `${e.clientY - r.top - size / 2}px`;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = el.style.overflow || "hidden";
      el.appendChild(s);
      window.setTimeout(() => s.remove(), 600);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // مؤشر ذهبي — سطح المكتب فقط
  useEffect(() => {
    if (reduced() || !window.matchMedia("(pointer: fine)").matches) return;
    setCursorOn(true);
    const pos = { x: -100, y: -100 };
    const trailPos = [0, 1, 2].map(() => ({ x: -100, y: -100 }));
    let raf = 0;
    const move = (e: PointerEvent) => {
      pos.x = e.clientX; pos.y = e.clientY;
      const hot = !!(e.target as HTMLElement)?.closest?.("button, a, input, textarea, select, [role='button']");
      dot.current?.classList.toggle("is-hot", hot);
    };
    const loop = () => {
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      let prev = pos;
      trailPos.forEach((tp, i) => {
        tp.x += (prev.x - tp.x) * 0.35; tp.y += (prev.y - tp.y) * 0.35;
        const el = trail.current[i];
        if (el) el.style.transform = `translate3d(${tp.x}px, ${tp.y}px, 0)`;
        prev = tp;
      });
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  const isAdmin = path.startsWith("/ZGFzaGJvYXJk") || path.startsWith("/admin");

  return (
    <>
      {!isAdmin && <div className="secure-line" aria-hidden />}
      <div
        aria-hidden
        className="route-progress"
        style={{ transform: `scaleX(${bar.p})`, opacity: bar.on ? 1 : 0 }}
      />
      {cursorOn && !isAdmin && (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} ref={(el) => { trail.current[i] = el; }} className="cursor-trail" style={{ opacity: 0.35 - i * 0.1 }} aria-hidden />
          ))}
          <div ref={dot} className="cursor-dot" aria-hidden />
        </>
      )}
    </>
  );
}
