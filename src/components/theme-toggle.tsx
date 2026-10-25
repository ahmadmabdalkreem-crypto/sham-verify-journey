import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

const KEY = "sc-theme";
// صفحات لوحة التحكم والإدارة تبقى داكنة دائمًا
const ADMIN_PATH_RE = /^\/(ZGFzaGJvYXJk|ZGV2aWNlcw|panel)(\/|$)/;

/** يُحقن في <head> لتطبيق الوضع المحفوظ قبل ظهور الصفحة (بدون وميض). */
export const themeInitScript = `try{var p=location.pathname;var admin=/^\\/(ZGFzaGJvYXJk|ZGV2aWNlcw|panel)(\\/|$)/.test(p);var t=localStorage.getItem("${KEY}");var light=t==="light";if(!admin&&light){document.documentElement.classList.add("theme-light");document.querySelectorAll(\x27meta[name="theme-color"]\x27).forEach(function(m){m.setAttribute("content","#f4f6fb")})}}catch(e){}`;

function applyTheme(light: boolean) {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  root.classList.toggle("theme-light", light);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", light ? "#f4f6fb" : "#0d6efd"));
  window.setTimeout(() => root.classList.remove("theme-transition"), 400);
}

export function ThemeToggle() {
  const [light, setLight] = useState<boolean | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(KEY); } catch { /* ignore */ }
    setLight(stored === "light");
  }, []);

  const isAdmin = ADMIN_PATH_RE.test(pathname);
  useEffect(() => {
    if (light === null) return;
    document.documentElement.classList.toggle("theme-light", !isAdmin && light);
  }, [isAdmin, light]);

  if (light === null || isAdmin) return null;

  const toggle = () => {
    const next = !light;
    try { navigator.vibrate?.(18); } catch { /* ignore */ }
    setLight(next);
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      data-haptic="off"
      onClick={toggle}
      aria-label={light ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
      title={light ? "الوضع الداكن" : "الوضع الفاتح"}
      className="fixed z-50 inline-flex size-11 items-center justify-center rounded-full border border-border bg-card/80 text-foreground shadow-lg backdrop-blur-xl transition-transform hover:scale-105 active:scale-95"
      style={{
        left: "max(0.75rem, env(safe-area-inset-left))",
        top: "calc(env(safe-area-inset-top) + 4.75rem)",
      }}
    >
      {light ? <Moon className="size-5" /> : <Sun className="size-5" />}
    </button>
  );
}
