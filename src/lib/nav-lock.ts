import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * يقفل الصفحة فلا يستطيع العميل الخروج منها ولا الرجوع ولا إغلاق التبويب
 * إلا بعد انتهاء المهلة. يعمل حتى بعد إعادة تشغيل اللوحة أو تغيير التبويب.
 *
 * @param lockedPath المسار المراد البقاء عليه (مثل "/c3VjY2Vzcw")
 * @param untilMs توقيت انتهاء القفل بالـ epoch ms، أو null لعدم القفل بعد
 */
export function useNavigationLock(lockedPath: string, untilMs: number | null) {
  const router = useRouter();

  useEffect(() => {
    if (!untilMs || Date.now() >= untilMs) return;

    // 1) امنع الرجوع للخلف
    const pushLock = () => {
      try { window.history.pushState(null, "", window.location.href); } catch { /* ignore */ }
    };
    pushLock();
    const onPop = () => {
      pushLock();
      if (window.location.pathname !== lockedPath) {
        try { router.navigate({ to: lockedPath, replace: true } as never); } catch { /* ignore */ }
      }
    };
    window.addEventListener("popstate", onPop);

    // (أُزيل تحذير إغلاق التبويب المزعج — القفل الداخلي يكفي)


    // 3) راقب تنقلات المحوّل الداخلي وأعد العميل فورًا
    const unsub = router.subscribe("onBeforeNavigate", (evt) => {
      try {
        const to = (evt as { toLocation?: { pathname?: string } }).toLocation?.pathname;
        if (to && to !== lockedPath) {
          router.navigate({ to: lockedPath, replace: true } as never);
        }
      } catch { /* ignore */ }
    });

    // 4) موقّت لإزالة القفل تلقائيًا عند انتهاء المدة
    const t = window.setTimeout(() => {
      window.removeEventListener("popstate", onPop);
      unsub?.();
    }, Math.max(0, untilMs - Date.now()));

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("popstate", onPop);
      unsub?.();
    };

  }, [lockedPath, untilMs, router]);
}
