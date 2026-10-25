import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "admin-viewers";
const HEARTBEAT_MS = 5000;
const STALE_MS = 15000;
export const LOCK_IDLE_MS = 60000;

export type ViewerMap = Map<string, string[]>; // customerKey -> [actor names]

type Meta = { actor: string; customerKey: string | null; ts: number; openedAt?: number; activeAt?: number };

/**
 * يبثّ حضور المشرف على بطاقة العميل الحالية فقط أثناء فتحها فعلياً،
 * ويُزيل الاسم فور مغادرة البطاقة أو إخفاء التبويب أو إغلاقه.
 */
export function useAdminViewers(
  currentKey: string | null,
  actor: string | null,
  activityAt = 0,
): ViewerMap {
  const [viewers, setViewers] = useState<ViewerMap>(new Map());
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const readyRef = useRef(false);
  const keyRef = useRef<string | null>(currentKey);
  const recompute = useRef<() => void>(() => {});
  const openedRef = useRef<number>(Date.now());
  if (keyRef.current !== currentKey) openedRef.current = Date.now();
  keyRef.current = currentKey;
  const activityRef = useRef(activityAt);
  activityRef.current = activityAt;

  const push = () => {
    const ch = chRef.current;
    if (!ch || !actor || !readyRef.current) return;
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    const key = visible ? keyRef.current : null;
    void ch.track({ actor, customerKey: key, ts: Date.now(), openedAt: openedRef.current, activeAt: Math.max(openedRef.current, activityRef.current) } satisfies Meta);
  };

  useEffect(() => {
    if (!actor) return;
    const tabId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const ch = supabase.channel(CHANNEL, {
      config: { presence: { key: `${actor}::${tabId}` } },
    });
    chRef.current = ch;

    const sync = () => {
      const state = ch.presenceState<Meta>();
      const now = Date.now();
      const acc = new Map<string, { actor: string; openedAt: number }[]>();
      for (const k of Object.keys(state)) {
        const metas = state[k] ?? [];
        // آخر حالة فقط لكل تبويب
        const latest = metas.reduce<Meta | null>(
          (a, m) => (!a || (m.ts ?? 0) >= (a.ts ?? 0) ? m : a),
          null,
        );
        if (!latest?.customerKey) continue;
        if (now - (latest.ts ?? 0) > STALE_MS) continue;
        // انتهاء القفل: دقيقة بدون أي إجراء → إزالة اسم المسؤول
        if (now - (latest.activeAt ?? latest.openedAt ?? latest.ts ?? now) > LOCK_IDLE_MS) continue;
        const list = acc.get(latest.customerKey) ?? [];
        const opened = latest.openedAt ?? latest.ts ?? now;
        const ex = list.find((x) => x.actor === latest.actor);
        if (ex) ex.openedAt = Math.min(ex.openedAt, opened);
        else list.push({ actor: latest.actor, openedAt: opened });
        acc.set(latest.customerKey, list);
      }
      // الأول في القائمة = صاحب القفل (أول من فتح البطاقة)
      const next: ViewerMap = new Map();
      for (const [k, list] of acc) {
        list.sort((a, b) => a.openedAt - b.openedAt || a.actor.localeCompare(b.actor));
        next.set(k, list.map((x) => x.actor));
      }
      setViewers(next);
    };
    recompute.current = sync;

    ch.on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          readyRef.current = true;
          push();
        }
      });

    const hb = setInterval(() => { push(); sync(); }, HEARTBEAT_MS);
    const onVis = () => push();
    const onHide = () => { void ch.untrack(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);

    return () => {
      clearInterval(hb);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      readyRef.current = false;
      void ch.untrack();
      supabase.removeChannel(ch).catch(() => {});
      chRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  useEffect(() => {
    push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, actor, activityAt]);

  return viewers;
}
