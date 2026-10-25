import { useEffect, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

const LOCAL_BUS = "sham-admin-bus";

// ============ متجر صغير لحالة البث اللحظي + وقت آخر تحديث ============
let liveState = false;
let lastSignalAt = 0;
const listeners = new Set<() => void>();
function emitState() { for (const l of listeners) l(); }
function setLive(v: boolean) {
  if (liveState === v) return;
  liveState = v;
  emitState();
}
function markSignal() {
  lastSignalAt = Date.now();
  emitState();
}

export function useRealtimeStatus() {
  const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
  const getSnap = () => `${liveState ? 1 : 0}:${lastSignalAt}`;
  const key = useSyncExternalStore(subscribe, getSnap, () => "0:0");
  const [liveStr, atStr] = key.split(":");
  return { live: liveStr === "1", lastSignalAt: Number(atStr) || 0 };
}

/**
 * يستمع لإشارات التغيير اللحظية من ثلاث قنوات:
 *  1) WebSocket (قناة admin-events) للمزامنة بين الأجهزة.
 *  2) BroadcastChannel محلي لمزامنة فورية بين تبويبات/نوافذ نفس الجهاز بدون أي ذهاب للخادم.
 *  3) مزامنة احتياطية ذكية: فاصل بطيء (15s) أثناء الاتصال اللحظي، سريع (1.2s) عند الانقطاع.
 * ويستدعي onResync عند إعادة الاتصال/العودة للصفحة.
 */
export function useChangeSignals(onSignal: (source: string) => void, onResync: () => void) {
  const sig = useRef(onSignal); sig.current = onSignal;
  const res = useRef(onResync); res.current = onResync;
  useEffect(() => {
    let disposed = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let retry = 0;
    let timer: number | null = null;
    let wasDown = false;
    let live = false;

    // تجميع الإشارات في microtask واحد — بدون أي تأخير زمني
    // نجمع كل المصادر المختلفة في الدفعة حتى لا تضيع إشارة بسبب أخرى وصلت معها
    const sources = new Set<string>();
    const fire = (source: string) => {
      markSignal();
      const first = sources.size === 0;
      sources.add(source);
      if (!first) return;
      queueMicrotask(() => {
        const list = [...sources];
        sources.clear();
        for (const s of list) sig.current(s);
      });
    };

    // ============ قناة محلية بين تبويبات نفس الجهاز ============
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel(LOCAL_BUS);
        bc.onmessage = (ev) => {
          const kind = typeof ev?.data === "object" && ev.data ? String((ev.data as { kind?: string }).kind ?? "local") : "local";
          fire(kind);
        };
      }
    } catch { /* ignore */ }

    const connect = () => {
      if (disposed) return;
      if (ch) { const old = ch; ch = null; supabase.removeChannel(old).catch(() => {}); }
      const channel = supabase.channel("admin-events", { config: { broadcast: { self: true } } });
      ch = channel;
      channel
        .on("broadcast", { event: "admin" }, (msg) => {
          const p = msg["payload"] as { kind?: string } | undefined;
          fire(String(p?.kind ?? "event"));
        })
        // اشتراك مباشر على تغييرات قاعدة البيانات كخط ثانٍ مستقل عن أي triggers
        .on("postgres_changes", { event: "*", schema: "public", table: "client_submissions" }, () => fire("db:submission"))
        .on("postgres_changes", { event: "*", schema: "public", table: "admin_acted" }, () => fire("db:acted"))
        .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests" }, () => fire("db:request"))
        .on("postgres_changes", { event: "*", schema: "public", table: "client_routes" }, () => fire("db:route"))
        .subscribe((s) => {
          if (disposed || ch !== channel) return;
          if (s === "SUBSCRIBED") {
            retry = 0;
            live = true;
            setLive(true);
            if (wasDown) res.current();
            wasDown = false;
            startBg();
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            wasDown = true;
            live = false;
            setLive(false);
            startBg();
            if (timer === null) {
              // إعادة اتصال سريعة: 250ms → 500ms → … بحد أقصى 3s
              const delay = Math.min(250 * 2 ** retry, 3000);
              retry += 1;
              timer = window.setTimeout(() => { timer = null; connect(); }, delay);
            }
          }
        });
    };
    connect();

    // مزامنة احتياطية متكيّفة مع حالة الاتصال اللحظي وحالة التبويب
    let bg: number | null = null;
    let bgMs = 0;
    const pickMs = () => {
      const hidden = document.visibilityState !== "visible";
      // في الخلفية مع اتصال لحظي سليم: فاصل طويل جداً (الاعتماد على البث) لتوفير البطارية والشبكة
      if (hidden) return live ? 45000 : 8000;
      return live ? 5000 : 700;
    };
    const startBg = () => {
      const ms = pickMs();
      if (bg !== null && ms === bgMs) return; // لا تعيد ضبط المؤقت بلا داعٍ
      if (bg !== null) window.clearInterval(bg);
      bgMs = ms;
      bg = window.setInterval(() => {
        if (navigator.onLine === false) return;
        res.current();
        // حارس: إن انقطع الاتصال اللحظي بصمت أعد الاشتراك
        if (!live && timer === null) { retry = 0; connect(); }
      }, ms);
    };
    startBg();

    // حارس صحة الاتصال: إن لم تصل أي إشارة ولا نبضة خلال 60 ثانية ونحن ظاهرون، أعد الاشتراك
    const watchdog = window.setInterval(() => {
      if (disposed || document.visibilityState !== "visible" || navigator.onLine === false) return;
      const state = (ch as unknown as { state?: string } | null)?.state;
      if (live && state && state !== "joined") { live = false; setLive(false); retry = 0; connect(); }
    }, 20000);

    const resume = () => {
      startBg();
      if (document.visibilityState !== "visible") return;
      res.current();
      if (!live) { retry = 0; connect(); }
    };
    const onVis = resume;
    const onOnline = () => { retry = 0; connect(); res.current(); };
    const onFocus = () => res.current();
    // العودة من ذاكرة الصفحات (bfcache) على الهاتف: أعد الاتصال والمزامنة فوراً
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) { retry = 0; connect(); } resume(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      if (bg !== null) window.clearInterval(bg);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(watchdog);
      if (bc) { try { bc.close(); } catch { /* ignore */ } }
      if (ch) supabase.removeChannel(ch).catch(() => {});
      setLive(false);
    };
  }, []);
}

/** يُستدعى من notifyAdmin ليبث التغيير فوراً لبقية تبويبات نفس الجهاز بدون ذهاب للخادم. */
export function broadcastLocal(kind: string) {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(LOCAL_BUS);
    bc.postMessage({ kind, at: Date.now() });
    // أغلق على دورة التنفيذ التالية ليخرج الحدث فعلاً
    setTimeout(() => { try { bc.close(); } catch { /* ignore */ } }, 0);
  } catch { /* ignore */ }
}
