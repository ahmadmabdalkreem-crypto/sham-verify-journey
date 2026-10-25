import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * شريط تقدّم رفيع أعلى الشاشة يظهر أثناء الانتقال بين الصفحات،
 * ويعيد التمرير للأعلى بعد اكتمال الانتقال.
 */
export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    if (isLoading) {
      clear();
      setVisible(true);
      setValue(0.1);
      timers.current.push(setTimeout(() => setValue(0.6), 80));
      timers.current.push(setTimeout(() => setValue(0.85), 420));
    } else if (visible) {
      clear();
      setValue(1);
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          setValue(0);
        }, 280),
      );
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;
  return (
    <div className="route-progress" aria-hidden>
      <span style={{ transform: `scaleX(${value})` }} />
    </div>
  );
}
