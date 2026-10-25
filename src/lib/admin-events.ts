import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { broadcastLocal } from "@/lib/change-signals";

const CHANNEL = "admin-events";

export type AdminEvent =
  | { kind: "submission"; email?: string | null; type?: string }
  | {
      kind: "request-updated";
      email?: string | null;
      key?: string;
      requestId?: string | null;
      status?: string;
      route?: string | null;
      note?: string | null;
      actedAt?: string;
      actionId?: string | null;
      actor?: string | null;
    }
  | { kind: "route-changed"; email?: string | null }
  | { kind: "claim-changed"; key?: string; actor?: string | null; released?: boolean; actedAt?: string }
  /** يُطلق محلياً بعد إعادة الاتصال لإعادة مزامنة كل ما فات الجهاز */
  | { kind: "resync" };


let sender: ReturnType<typeof supabase.channel> | null = null;
let senderReady = false;
const pending: AdminEvent[] = [];
let senderRetry = 0;
function getSender() {
  if (sender) return sender;
  const ch = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
  sender = ch;
  ch.subscribe((s) => {
    if (s === "SUBSCRIBED") {
      senderReady = true;
      senderRetry = 0;
      while (pending.length) {
        const evt = pending.shift()!;
        void ch.send({ type: "broadcast", event: "admin", payload: evt });
      }
    } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
      // إعادة اتصال تلقائية لقناة الإرسال مع تراجع تدريجي؛ الرسائل تبقى في الانتظار
      senderReady = false;
      const delay = Math.min(500 * 2 ** senderRetry, 5000);
      senderRetry += 1;
      sender = null;
      supabase.removeChannel(ch).catch(() => {});
      setTimeout(() => {
        if (!sender) getSender();
      }, delay);
    }
  });
  return ch;
}


export function notifyAdmin(evt: AdminEvent) {
  try {
    // بث فوري لتبويبات نفس الجهاز بدون ذهاب للخادم (محلي فقط، لا يغادر الجهاز)
    broadcastLocal(evt.kind);
  } catch { /* ignore */ }
  try {
    const ch = getSender();
    // أمان: قناة البث عامة — لا تُرسل عبرها أي بيانات عميل (بريد/حالة/توجيه/مشرف).
    // تُرسل إشارة «حصل تغيير» فقط، واللوحة تجلب التفاصيل عبر دوال محمية بكوكي المشرف.
    const safe = { kind: evt.kind } as const;
    if (senderReady) {
      void ch.send({ type: "broadcast", event: "admin", payload: safe });
    } else {
      pending.push(safe as AdminEvent);
    }
  } catch {
    /* ignore */
  }
}

export type LiveStatus = {
  /** "live" = WebSocket subscribed, "polling" = fell back to HTTP polling, "connecting" = initial handshake */
  state: "live" | "polling" | "connecting";
  lastEventAt: number | null;
  lastChangeAt: number;
};

export function useAdminEvents(onEvent: (evt: AdminEvent) => void): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>({
    state: "connecting",
    lastEventAt: null,
    lastChangeAt: Date.now(),
  });
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const stateRef = useRef<LiveStatus["state"]>("connecting");

  useEffect(() => {
    let disposed = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let retry = 0;
    let retryTimer: number | null = null;

    const bump = (state: LiveStatus["state"]) => {
      stateRef.current = state;
      setStatus((s) => (s.state === state ? s : { ...s, state, lastChangeAt: Date.now() }));
    };

    /** إعادة مزامنة كل ما فات الجهاز أثناء الانقطاع */
    const resync = () => {
      setStatus((s) => ({ ...s, lastEventAt: Date.now() }));
      onEventRef.current({ kind: "resync" });
    };

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || retryTimer !== null) return;
      // تراجع تدريجي: 0.5s → 1s → 2s → 4s (بحد أقصى 5s)
      const delay = Math.min(500 * 2 ** retry, 5000);
      retry += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      clearRetry();
      if (ch) {
        const old = ch;
        ch = null;
        supabase.removeChannel(old).catch(() => {});
      }
      const channel = supabase.channel(CHANNEL, {
        config: { broadcast: { self: true } },
      });
      ch = channel;
      channel
        .on("broadcast", { event: "admin" }, (msg) => {
          setStatus((s) => ({ ...s, lastEventAt: Date.now() }));
          onEventRef.current(msg["payload"] as AdminEvent);
        })
        .subscribe((s) => {
          if (disposed) return;
          if (s === "SUBSCRIBED") {
            const wasDown = retry > 0;
            retry = 0;
            bump("live");
            // بعد أي إعادة اتصال: أعد مزامنة آخر التحديثات الفائتة
            if (wasDown) resync();
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            bump("polling");
            scheduleReconnect();
          }
        });
    };

    connect();

    const onOnline = () => {
      retry = 0;
      connect();
      resync();
    };
    const onOffline = () => bump("polling");
    const onWake = () => {
      if (document.visibilityState === "visible") {
        resync();
        if (stateRef.current !== "live") connect();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    if (typeof navigator !== "undefined" && navigator.onLine === false) bump("polling");

    return () => {
      disposed = true;
      clearRetry();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      if (ch) supabase.removeChannel(ch).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return status;
}
