import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(pathname);
  const prev = useRef(pathname);

  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname;
      setKey(pathname);
    }
  }, [pathname]);

  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches));
  }, []);

  return (
    <div key={key} className={reduce ? undefined : "route-fade"}>
      {children}
    </div>
  );
}
