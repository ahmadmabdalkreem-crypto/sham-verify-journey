import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  }, []);

  return (
    <div key={pathname} className={reduce ? undefined : "route-fade"}>
      {children}
    </div>
  );
}
