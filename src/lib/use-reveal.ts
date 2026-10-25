import { useEffect } from "react";

/**
 * ظهور تدريجي (fade + slide up) لأي عنصر يحمل data-reveal،
 * مع تأخير متدرج 100ms بين العناصر الشقيقة.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset['reveal'] = "in";
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    const attach = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-reveal=""], [data-reveal="off"]'),
      );
      const groups = new Map<Element | null, number>();
      for (const node of nodes) {
        const parent = node.parentElement;
        const index = groups.get(parent) ?? 0;
        groups.set(parent, index + 1);
        node.style.setProperty("--reveal-delay", `${Math.min(index, 6) * 100}ms`);
        node.dataset['reveal'] = "off";
        observer.observe(node);
      }
    };

    attach();
    const timer = window.setTimeout(attach, 350);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);
}
