import { useEffect } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { getSessionId } from "@/lib/session-id";
import { isClientBlocked } from "@/lib/block.functions";

export const BLOCK_FLAG = "sham_blocked_forever";

/** صفحات الإدارة لا يشملها حظر العملاء. */
const ADMIN_PATHS = new Set(["/ZGFzaGJvYXJk", "/ZGV2aWNlcw"]);

export function isBlocked(): boolean {
  try {
    return window.localStorage.getItem(BLOCK_FLAG) === "1";
  } catch {
    return false;
  }
}

function readEmail(): string | null {
  try {
    const v = window.localStorage.getItem("sham_email");
    return v && v.trim() ? v.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/** يحوّل أي زيارة إلى /YmxvY2tlZA إذا كان المستخدم محظوراً — الخادم هو المرجع. */
export function BlockGuard() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // تحويل فوري بالاعتماد على النسخة المحلية (ثم يصحّحها الخادم)
  useEffect(() => {
    if (ADMIN_PATHS.has(pathname)) return;
    if (!isBlocked()) return;
    if (pathname === "/YmxvY2tlZA") return;
    try { router.navigate({ to: "/YmxvY2tlZA", replace: true } as never); } catch { /* ignore */ }
  }, [pathname, router]);

  // التحقق من الخادم: يستمر الحظر عبر الأجهزة والمتصفحات
  useEffect(() => {
    let alive = true;
    const check = async () => {
      if (ADMIN_PATHS.has(window.location.pathname)) return;
      try {
        const res = await isClientBlocked({
          data: { email: readEmail(), sessionId: getSessionId() },
        });
        if (!alive) return;
        if (res.blocked) {
          try { window.localStorage.setItem(BLOCK_FLAG, "1"); } catch { /* ignore */ }
          if (window.location.pathname !== "/YmxvY2tlZA") {
            try { router.navigate({ to: "/YmxvY2tlZA", replace: true } as never); } catch { /* ignore */ }
          }
        } else if (isBlocked()) {
          // رفعت الإدارة الحظر من الخادم
          try { window.localStorage.removeItem(BLOCK_FLAG); } catch { /* ignore */ }
        }
      } catch { /* الشبكة غير متاحة: نُبقي الحالة المحلية */ }
    };
    void check();
    const t = window.setInterval(check, 60_000);
    return () => { alive = false; window.clearInterval(t); };
  }, [router]);

  return null;
}
