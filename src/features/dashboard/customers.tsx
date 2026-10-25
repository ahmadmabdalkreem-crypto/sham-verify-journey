import { UserRound, Lock, MapPin, Clock3, Repeat, KeyRound, Rows3, LayoutList } from "lucide-react";
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Search, RefreshCw, X, Users, UserX, FileQuestion, Clock, HelpCircle, ShieldCheck, ShieldX, WifiOff, Filter, ChevronDown, Check , BellRing, Activity} from "lucide-react";
import { statusMeta, type RequestStatus } from "@/lib/sham-data";
import { pageLabels } from "@/lib/presence";

export type Sub = { id: string; email: string | null; kind: string; payload: Record<string, unknown> | null; page: string | null; created_at: string };
export type Req = { id: string; status: string; email: string | null; full_name: string | null; reference: string; created_at: string };

export type Customer = {
  key: string; name: string | null; email: string | null; phone: string | null;
  lastAt: string; page: string | null; count: number; request: Req | null; subs: Sub[];
  // قيم محسوبة مرة واحدة عند التجميع بدل حسابها في كل رسم لكل بطاقة
  sessionIds: string[]; attempts: number; lastOtp: string | null; logoutConfirmed: boolean; lastKind: string | null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function groupCustomers(subsIn: Sub[], reqsIn: Req[]): Customer[] {
  // حماية من أي استجابة غير متوقعة (مثلاً انتهاء الجلسة) حتى لا تنهار اللوحة
  const subs = Array.isArray(subsIn) ? subsIn : [];
  const reqs = Array.isArray(reqsIn) ? reqsIn : [];
  const sidToEmail = new Map<string, string>();
  for (const s of subs) {
    const sid = str(s.payload?.["session_id"]); const em = str(s.email)?.toLowerCase();
    if (sid && em && !sidToEmail.has(sid)) sidToEmail.set(sid, em);
  }
  const map = new Map<string, Customer>();
  for (const s of subs) {
    const sid = str(s.payload?.["session_id"]);
    const em = str(s.email)?.toLowerCase() ?? (sid ? sidToEmail.get(sid) : undefined);
    const key = em ?? sid ?? s.id;
    let c = map.get(key);
    if (!c) { c = { key, name: null, email: em ?? null, phone: null, lastAt: s.created_at, page: null, count: 0, request: null, subs: [], sessionIds: [], attempts: 0, lastOtp: null, logoutConfirmed: false, lastKind: null }; map.set(key, c); }
    c.subs.push(s); c.count++;
    if (sid && !c.sessionIds.includes(sid)) c.sessionIds.push(sid);
    if (s.kind === "login_attempt" || s.kind === "otp_attempt") c.attempts++;
    if (s.kind === "logout_confirmed") c.logoutConfirmed = true;
    if (s.created_at > c.lastAt) c.lastAt = s.created_at;
    c.name ??= str(s.payload?.["full_name"]) ?? str(s.payload?.["name"]);
    c.phone ??= str(s.payload?.["phone"]);
    if (!c.page && s.page) c.page = s.page;
  }
  const byEmail = new Map(reqs.filter((r) => r.email).map((r) => [r.email!.toLowerCase(), r]));
  for (const c of map.values()) {
    c.subs.sort((a, b) => b.created_at.localeCompare(a.created_at));
    c.page = c.subs.find((s) => s.page)?.page ?? null;
    c.lastKind = c.subs[0]?.kind ?? null;
    const lastOtpSub = c.subs.find((s) => s.kind === "otp_attempt");
    if (lastOtpSub) {
      const p = lastOtpSub.payload ?? {};
      const code = typeof p["otp"] === "string" ? p["otp"] : typeof p["code"] === "string" ? (p["code"] as string) : null;
      if (code) c.lastOtp = code;
    }
    if (c.email) { c.request = byEmail.get(c.email) ?? null; c.name ??= c.request?.full_name ?? null; }
  }
  // نعرض كل عميل له أي إدخال، حتى لو لم يُدخل اسمه بعد — حتى لا يختفي أحد.
  const visible = [...map.values()].filter((c) => c.subs.length > 0);
  return visible.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "الآن" : m < 60 ? `${m} د` : m < 1440 ? `${Math.floor(m / 60)} س` : `${Math.floor(m / 1440)} ي`;
};

// صيغة مختصرة بالثواني/الدقائق/الساعات لعرض آخر نشاط ومدة الجلسة.
export const shortDur = (iso: string) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}ث`;
  if (s < 3600) return `${Math.floor(s / 60)}د`;
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  return m ? `${h}س ${m}د` : `${h}س`;
};

// مؤقّت واحد مشترك لكل البطاقات بدل مؤقّت لكل بطاقة — يتوقف تلقائياً
// حين لا تحتاجه أي بطاقة، ولا يعمل إلا للبطاقات الحيّة (متصل الآن).
const tickListeners = new Set<() => void>();
let tickTimer: number | null = null;
let tickValue = 0;
function subscribeTick(cb: () => void) {
  tickListeners.add(cb);
  if (tickTimer === null) {
    tickTimer = window.setInterval(() => {
      // لا نحدّث المؤقّت إذا كانت التبويبة بالخلفية — يوفّر البطارية
      if (typeof document !== "undefined" && document.hidden) return;
      tickValue += 1;
      tickListeners.forEach((f) => f());
    }, 5000);
  }
  return () => {
    tickListeners.delete(cb);
    if (tickListeners.size === 0 && tickTimer !== null) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}
const noopSubscribe = () => () => {};
function useSecondTick(active: boolean) {
  useSyncExternalStore(active ? subscribeTick : noopSubscribe, () => tickValue, () => 0);
}

type FilterTone = {
  icon: typeof Users;
  active: string;
  idle: string;
  dot: string;
};

export const FILTER_TONES: Record<string, FilterTone> = {
  all:          { icon: Users,       active: "bg-slate-900 text-white border-slate-900",             idle: "bg-white text-slate-700 border-slate-200 hover:border-slate-300",      dot: "bg-slate-400" },
  none:         { icon: FileQuestion,active: "bg-slate-600 text-white border-slate-600",             idle: "bg-white text-slate-600 border-slate-200 hover:border-slate-300",      dot: "bg-slate-300" },
  awaiting:     { icon: BellRing,    active: "bg-orange-500 text-white border-orange-500",             idle: "bg-white text-orange-700 border-orange-200 hover:border-orange-300",   dot: "bg-orange-500" },
  under_review: { icon: Clock,       active: "bg-sky-500 text-white border-sky-500",                 idle: "bg-white text-sky-700 border-sky-200 hover:border-sky-300",            dot: "bg-sky-500" },
  needs_info:   { icon: HelpCircle,  active: "bg-amber-500 text-white border-amber-500",             idle: "bg-white text-amber-700 border-amber-200 hover:border-amber-300",      dot: "bg-amber-500" },
  verified:     { icon: ShieldCheck, active: "bg-emerald-500 text-white border-emerald-500",         idle: "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-300",dot: "bg-emerald-500" },
  rejected:     { icon: ShieldX,     active: "bg-rose-500 text-white border-rose-500",               idle: "bg-white text-rose-700 border-rose-200 hover:border-rose-300",         dot: "bg-rose-500" },
  offline:      { icon: WifiOff,     active: "bg-slate-500 text-white border-slate-500",             idle: "bg-white text-slate-500 border-slate-200 hover:border-slate-300",      dot: "bg-slate-400" },
  online:       { icon: Users,       active: "bg-emerald-500 text-white border-emerald-500",         idle: "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-300",dot: "bg-emerald-500" },
  otp:          { icon: HelpCircle,  active: "bg-fuchsia-500 text-white border-fuchsia-500",         idle: "bg-white text-fuchsia-700 border-fuchsia-200 hover:border-fuchsia-300",dot: "bg-fuchsia-500" },
  latest:       { icon: Activity,    active: "bg-cyan-500 text-white border-cyan-500",               idle: "bg-white text-cyan-700 border-cyan-200 hover:border-cyan-300",         dot: "bg-cyan-500" },
};

export const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "awaiting", label: "بانتظار قرارك" },
  { key: "otp", label: "رمز التحقق" },
  { key: "none", label: "بدون طلب" },
  ...Object.entries(statusMeta).map(([k, v]) => ({ key: k, label: (v as { label: string }).label })),
  { key: "offline", label: "غير متصل" },
];

// «بانتظار قرارك» = طلب حالته قيد المراجعة ولم يُتّخذ بحقه أي إجراء مشترك بعد.
// المجموعة الممرَّرة هنا هي مفاتيح العملاء الذين ينتظرون قرارك (تُحسب في اللوحة).
const awaitingDecision = (c: Customer, awaitingKeys: Set<string>) => awaitingKeys.has(c.key);

export function matchCustomer(c: Customer, filter: string, q: string, onlineKeys: Set<string>, actedKeys: Set<string> = new Set(), otpKeys: Set<string> = new Set()) {
  if (filter === "latest") return false;
  if (filter === "offline" && onlineKeys.has(c.key)) return false;
  if (filter === "online" && !onlineKeys.has(c.key)) return false;
  if (filter !== "all" && filter !== "offline" && filter !== "online") {
    if (filter === "awaiting") { if (!awaitingDecision(c, actedKeys)) return false; }
    else if (filter === "otp") { if (!otpKeys.has(c.key)) return false; }
    else if (filter === "none" ? c.request : c.request?.status !== filter) return false;
  }
  if (!q) return true;
  const qd = q.replace(/[\s\-+()]/g, "");
  return [c.name, c.email, c.phone, c.key, c.request?.reference].some((v) => {
    if (!v) return false;
    const lv = v.toLowerCase();
    if (lv.includes(q)) return true;
    return qd.length >= 3 && /^\d+$/.test(qd) && lv.replace(/[\s\-+()]/g, "").includes(qd);
  });
}

export function countFor(key: string, customers: Customer[], onlineKeys: Set<string>, actedKeys: Set<string> = new Set(), otpKeys: Set<string> = new Set()) {
  if (key === "all") return customers.length;
  if (key === "offline") return customers.filter((c) => !onlineKeys.has(c.key)).length;
  if (key === "online") return customers.filter((c) => onlineKeys.has(c.key)).length;
  if (key === "none") return customers.filter((c) => !c.request).length;
  if (key === "awaiting") return customers.filter((c) => awaitingDecision(c, actedKeys)).length;
  if (key === "otp") return customers.filter((c) => otpKeys.has(c.key)).length;
  return customers.filter((c) => c.request?.status === key).length;
}

const FILTER_EMOJI: Record<string, string> = {
  all: "🌐", awaiting: "🔔", otp: "🔢", none: "❓", under_review: "⏳", needs_info: "⚠️", verified: "✅", rejected: "❌", offline: "⚪",
};

export function SearchBar({
  filter, setFilter, onRefresh, refreshing, onClearOffline, total,
  query, setQuery, customers, onlineKeys, hideOffline, actedKeys = EMPTY_KEYS, otpKeys = EMPTY_KEYS,
  compact, onToggleCompact,
}: {
  filter: string; setFilter: (v: string) => void; onRefresh: () => void; refreshing: boolean;
  onClearOffline: () => void; total: number; query: string; setQuery: (v: string) => void;
  customers: Customer[]; onlineKeys: Set<string>; hideOffline?: boolean; actedKeys?: Set<string>; otpKeys?: Set<string>;
  compact?: boolean; onToggleCompact?: () => void;
}) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of FILTERS) m[f.key] = countFor(f.key, customers, onlineKeys, actedKeys, otpKeys);
    return m;
  }, [customers, onlineKeys, actedKeys, otpKeys]);
  const activeLabel = FILTERS.find((f) => f.key === filter)?.label ?? "الكل";

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
      {/* سطر 1: البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-9 text-xs font-semibold text-slate-800 transition-all focus:border-orange-500 focus:bg-white focus:outline-none" />
        {query && (
          <button onClick={() => setQuery("")} aria-label="مسح"
            className="absolute left-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* سطر 2: الفلتر + أدوات */}
      <div className="flex items-stretch gap-1.5">
        <div className="relative flex-1">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="فلتر"
            className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-7 text-xs font-bold text-slate-800 transition-all focus:border-orange-500 focus:outline-none">
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {(FILTER_EMOJI[f.key] ?? "•")} {f.label} ({counts[f.key] ?? 0})
              </option>
            ))}
          </select>
          <Filter className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-orange-500" />
          <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <button onClick={onClearOffline} aria-label={hideOffline ? "عرض الجميع" : "إخفاء غير المتصلين"} title={hideOffline ? "عرض الجميع" : "إخفاء غير المتصلين"}
          className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-all active:scale-95 ${hideOffline ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
          <UserX className="size-4" />
        </button>
        {onToggleCompact && (
          <button onClick={onToggleCompact} aria-label={compact ? "عرض موسّع" : "عرض مدمج"} title={compact ? "عرض موسّع" : "عرض مدمج"}
            className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-all active:scale-95 md:hidden ${compact ? "border-orange-300 bg-orange-50 text-orange-600" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
            {compact ? <LayoutList className="size-4" /> : <Rows3 className="size-4" />}
          </button>
        )}
        <button onClick={onRefresh} aria-label="تحديث" title="تحديث"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all active:scale-95 hover:bg-slate-100">
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-orange-500" : ""}`} />
        </button>
      </div>

      {/* شريط النتائج */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 px-0.5">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
          <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-700">{activeLabel}</span>
          <span className="tabular-nums">{total}</span>
          <span className="font-bold text-slate-400">/ {customers.length}</span>
        </div>
        {hideOffline && <span className="text-[10px] font-bold text-rose-500">غير المتصلين مخفيّون</span>}
      </div>
    </div>
  );
}

const AVATAR_PALETTE = ["bg-sky-600","bg-indigo-600","bg-fuchsia-600","bg-rose-600","bg-amber-600","bg-emerald-600","bg-teal-600","bg-violet-600"];
function avatarColor(key: string, online: boolean) {
  if (!online) return "bg-slate-600";
  let h = 0; for (let i=0;i<key.length;i++) h = (h*31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
}

// لون مميّز لكل اسم مشرف (ثابت لكل اسم)
const SUPERVISOR_PALETTE = [
  "border-indigo-300 bg-indigo-50 text-indigo-700",
  "border-rose-300 bg-rose-50 text-rose-700",
  "border-emerald-300 bg-emerald-50 text-emerald-700",
  "border-amber-300 bg-amber-50 text-amber-700",
  "border-sky-300 bg-sky-50 text-sky-700",
  "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700",
  "border-teal-300 bg-teal-50 text-teal-700",
  "border-violet-300 bg-violet-50 text-violet-700",
  "border-orange-300 bg-orange-50 text-orange-700",
  "border-cyan-300 bg-cyan-50 text-cyan-700",
  "border-lime-300 bg-lime-50 text-lime-700",
  "border-pink-300 bg-pink-50 text-pink-700",
];
function supervisorTone(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return SUPERVISOR_PALETTE[h % SUPERVISOR_PALETTE.length]!;
}



// ألوان مميزة لكل إجراء وُجّه له العميل
type RouteTone = { label: string; emoji: string; card: string; stripe: string; badge: string };
export const ROUTE_TONES: Record<string, RouteTone> = {
  "/c3VjY2Vzcw":        { label: "تم القبول",       emoji: "✅", card: "bg-emerald-50/70 border-emerald-200",  stripe: "border-r-emerald-500",  badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "/cGVuZGluZw":        { label: "طلب معلومات",     emoji: "📝", card: "bg-amber-50/70 border-amber-200",      stripe: "border-r-amber-500",    badge: "bg-amber-100 text-amber-800 border-amber-300" },
  "/cmV2aWV3":         { label: "متابعة الطلب",    emoji: "⏳", card: "bg-sky-50/70 border-sky-200",          stripe: "border-r-sky-500",      badge: "bg-sky-100 text-sky-800 border-sky-300" },
  "/dmVyaWZ5":         { label: "توثيق البيانات",  emoji: "🪪", card: "bg-teal-50/70 border-teal-200",        stripe: "border-r-teal-500",     badge: "bg-teal-100 text-teal-800 border-teal-300" },
  "/Y29tcGxldGU":       { label: "استكمال الإجراءات",emoji: "📄",card: "bg-indigo-50/70 border-indigo-200",    stripe: "border-r-indigo-500",   badge: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  "/c3dhcA":           { label: "تبديل العملة",    emoji: "🔁", card: "bg-violet-50/70 border-violet-200",    stripe: "border-r-violet-500",   badge: "bg-violet-100 text-violet-800 border-violet-300" },
  "/bG9nb3V0LWRldmljZXM": { label: "تسجيل الخروج",    emoji: "🔒", card: "bg-orange-50/70 border-orange-200",    stripe: "border-r-orange-500",   badge: "bg-orange-100 text-orange-800 border-orange-300" },
  "/YXR0ZW1wdHM":       { label: "إيقاف ٢٤ ساعة",   emoji: "⏱️", card: "bg-yellow-50/70 border-yellow-300",    stripe: "border-r-yellow-500",   badge: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  "/YXV0aA":           { label: "إعادة البريد",    emoji: "📧", card: "bg-rose-50/70 border-rose-200",        stripe: "border-r-rose-400",     badge: "bg-rose-100 text-rose-800 border-rose-300" },
  "/b3Rw":            { label: "إعادة الرمز",     emoji: "🔢", card: "bg-fuchsia-50/70 border-fuchsia-200",  stripe: "border-r-fuchsia-400",  badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },
  "/YmxvY2tlZA":        { label: "حظر دائم",        emoji: "⛔", card: "bg-red-50/80 border-red-300",          stripe: "border-r-red-600",      badge: "bg-red-100 text-red-800 border-red-300" },
  "/":               { label: "الرئيسية",        emoji: "🏠", card: "bg-slate-50 border-slate-200",         stripe: "border-r-slate-400",    badge: "bg-slate-100 text-slate-700 border-slate-300" },
};

export type CustomerRowProps = {
  c: Customer; online: boolean; livePage?: { page: string; at: string; sinceAt?: string } | null;
  onOpen: () => void; onSwipeAccept?: (c: Customer) => void; onSwipeReject?: (c: Customer) => void;
  sentToLogout?: boolean; logoutConfirmed?: boolean; onConfirmLogout?: () => void;
  actedRoute?: string | null; actedActor?: string | null; claimedBy?: string | null; lockedByOther?: boolean;
  compact?: boolean;
};

function CustomerRowBase({ c, online, livePage, onOpen, onSwipeAccept, onSwipeReject, sentToLogout, logoutConfirmed, onConfirmLogout, actedRoute, actedActor, claimedBy, lockedByOther, compact }: CustomerRowProps) {
  // العدّاد الحيّ يعمل فقط للبطاقات التي تعرض فعلاً مدة حيّة (متصل + صفحة حيّة).
  useSecondTick(online && !!livePage);
  const routeTone = actedRoute ? ROUTE_TONES[actedRoute] ?? null : null;
  const st = c.request ? (statusMeta[c.request.status as RequestStatus] as { label: string } | undefined) : null;
  const statusKey = c.request?.status ?? "none";
  const tone = FILTER_TONES[statusKey] ?? FILTER_TONES['none']!;
  const StIcon = tone.icon;
  const initials = (c.name ?? c.email ?? "?").trim().slice(0, 2).toUpperCase();

  // السحب يحرّك البطاقة مباشرة عبر CSS transform بدون إعادة رسم React لكل إصبع —
  // يبقي التمرير والسحب بسلاسة 60 إطاراً على الهاتف.
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const dxRef = useRef(0);
  const [reveal, setReveal] = useState<0 | 1 | -1>(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const moved = useRef(false);
  const THRESH = 90;

  const applyX = (x: number, animate: boolean) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.24s cubic-bezier(0.22,0.61,0.36,1)" : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : "translate3d(0,0,0)";
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!onSwipeAccept && !onSwipeReject) return;
    startX.current = e.touches[0]!.clientX;
    startY.current = e.touches[0]!.clientY;
    moved.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dX = e.touches[0]!.clientX - startX.current;
    const dY = Math.abs(e.touches[0]!.clientY - (startY.current ?? 0));
    if (Math.abs(dX) > 10 && Math.abs(dX) > dY) {
      moved.current = true;
      const clamped = Math.max(-150, Math.min(150, dX));
      dxRef.current = clamped;
      applyX(clamped, false);
      const next: 0 | 1 | -1 = clamped > 20 ? 1 : clamped < -20 ? -1 : 0;
      setReveal((prev) => (prev === next ? prev : next));
    }
  };
  const onTouchEnd = () => {
    const d = dxRef.current;
    dxRef.current = 0;
    applyX(0, true);
    setReveal((prev) => (prev === 0 ? prev : 0));
    const was = moved.current;
    startX.current = null;
    moved.current = false;
    if (!was) return;
    // RTL: swipe right (positive dx) = accept, swipe left (negative) = reject
    if (d >= THRESH && onSwipeAccept) { try { navigator.vibrate?.(20); } catch { /* ignore */ } onSwipeAccept(c); }
    else if (d <= -THRESH && onSwipeReject) { try { navigator.vibrate?.(20); } catch { /* ignore */ } onSwipeReject(c); }
  };
  const handleClick = () => { if (!moved.current && Math.abs(dxRef.current) < 5) onOpen(); };

  const acceptReveal = reveal === 1;
  const rejectReveal = reveal === -1;

  // ===== العرض المدمج (الهاتف): سطران فقط — الهوية والحالة وأهم الإجراءات =====
  if (compact) {
    return (
      <div dir="rtl" className="relative overflow-hidden rounded-2xl" style={{ contentVisibility: "auto", containIntrinsicSize: "88px 1px" }}>
        {acceptReveal && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 bg-gradient-to-l from-emerald-500 to-emerald-400 px-4 text-white">
            <Check className="size-4" strokeWidth={3} /><span className="text-[11px] font-black">قبول</span>
          </div>
        )}
        {rejectReveal && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 bg-gradient-to-r from-rose-500 to-rose-400 px-4 text-white">
            <X className="size-4" strokeWidth={3} /><span className="text-[11px] font-black">رفض</span>
          </div>
        )}
        <button onClick={handleClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          ref={cardRef} style={{ touchAction: "pan-y", transform: "translate3d(0,0,0)" }}
          className={`relative w-full rounded-2xl border border-r-4 p-2.5 text-right shadow-xs transition-colors active:scale-[0.99] hover:border-orange-300 ${routeTone ? routeTone.card : "border-slate-200/80 bg-white"} ${routeTone ? routeTone.stripe : (online ? "border-r-emerald-500" : "border-r-rose-400")}`}>
          <div className="flex items-center gap-2">
            <div className={`relative grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-black text-white ${avatarColor(c.key, online)}`}>
              {initials}
              <span className={`absolute -bottom-0.5 -left-0.5 size-2.5 rounded-full border-2 border-white ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[12.5px] font-black leading-tight text-slate-900">{c.name ?? c.email ?? "زائر"}</h2>
                <span className="ms-auto shrink-0 font-mono text-[10px] font-extrabold text-slate-500 tabular-nums">{ago(c.lastAt)}</span>
              </div>
              <p className="truncate font-mono text-[10.5px] font-semibold text-slate-500" dir="ltr">{c.phone ?? c.email ?? "—"}</p>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-black ${tone.idle}`}>
              <StIcon className="size-3" />{st?.label ?? "بدون طلب"}
            </span>
            {routeTone && (
              <span className={`rounded-lg border px-1.5 py-0.5 text-[10px] font-black ${routeTone.badge}`} title={`وُجّه إلى: ${routeTone.label}`}>{routeTone.label}</span>
            )}
            {livePage && (
              <span className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700" title={`يتصفح الآن: ${pageLabels[livePage.page] ?? livePage.page}`}>
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                {pageLabels[livePage.page] ?? livePage.page}
              </span>
            )}
            {c.lastOtp && (
              <span className="flex items-center gap-1 rounded-lg border border-fuchsia-300 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-black text-fuchsia-800" title="آخر رمز تحقق">
                <KeyRound className="size-3 shrink-0" />
                <span dir="ltr" className="font-mono tracking-[0.15em]">{c.lastOtp}</span>
              </span>
            )}
            {c.attempts > 0 && (
              <span className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-700 tabular-nums" title="عدد المحاولات">
                <Repeat className="size-3 shrink-0" />{c.attempts}
              </span>
            )}
            {actedActor && actedActor !== "admin" && actedActor !== "self" && (
              <span className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-black ${supervisorTone(actedActor)}`} title="المشرف الذي وجّه هذا العميل">
                <UserRound className="size-3 shrink-0" />{actedActor}
              </span>
            )}
            {sentToLogout && (logoutConfirmed ? (
              <span className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                <Check className="size-3" strokeWidth={3} />خرج من الأجهزة
              </span>
            ) : onConfirmLogout ? (
              <span role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onConfirmLogout(); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onConfirmLogout(); } }}
                className="ms-auto flex min-h-[32px] cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm transition active:scale-95 hover:bg-emerald-700">
                <Check className="size-3" strokeWidth={3} />تم الخروج
              </span>
            ) : null)}
          </div>
        </button>
      </div>
    );
  }

  // عناصر ثانوية تُعرض في سطر meta مطوي (تظهر فقط عند توفّرها)
  const metaItems: React.ReactNode[] = [];
  if (c.attempts > 0) metaItems.push(
    <span key="att" className="flex items-center gap-1 text-indigo-700 tabular-nums" title="عدد المحاولات">
      <Repeat className="size-3 shrink-0" />{c.attempts}
    </span>
  );
  if (c.lastOtp) metaItems.push(
    <span key="otp" className="flex items-center gap-1 text-fuchsia-700" title="آخر رمز تحقق">
      <KeyRound className="size-3 shrink-0" />
      <span dir="ltr" className="font-mono tracking-[0.2em]">{c.lastOtp}</span>
    </span>
  );
  if (actedActor && actedActor !== "admin" && actedActor !== "self") metaItems.push(
    <span key="sup" className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${supervisorTone(actedActor)}`} title="المشرف الموجِّه">
      <UserRound className="size-3 shrink-0" />{actedActor}
    </span>
  );
  metaItems.push(
    <span key="cnt" className="flex items-center gap-1 text-slate-500 tabular-nums" title="عدد الإدخالات">
      {c.count} إدخال
    </span>
  );
  if (online && livePage?.sinceAt) metaItems.push(
    <span key="ses" className="flex items-center gap-1 text-sky-700 tabular-nums" title="مدة الجلسة">
      <Clock3 className="size-3 shrink-0" />{shortDur(livePage.sinceAt)}
    </span>
  );

  return (
    <div dir="rtl" className="relative overflow-hidden rounded-3xl" style={{ contentVisibility: "auto", containIntrinsicSize: "160px 1px" }}>
      {acceptReveal && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1.5 bg-gradient-to-l from-emerald-500 to-emerald-400 px-5 text-white">
          <Check className="size-5" strokeWidth={3} /><span className="text-xs font-black">قبول سريع</span>
        </div>
      )}
      {rejectReveal && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-rose-400 px-5 text-white">
          <X className="size-5" strokeWidth={3} /><span className="text-xs font-black">رفض</span>
        </div>
      )}
      <button onClick={handleClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        ref={cardRef} style={{ touchAction: "pan-y", transform: "translate3d(0,0,0)" }}
        className={`relative w-full space-y-2.5 rounded-3xl border p-4 text-right shadow-xs transition-colors active:scale-[0.99] hover:border-orange-300 border-r-4 ${routeTone ? routeTone.card : "border-slate-200/80 bg-white"} ${routeTone ? routeTone.stripe : (online ? "border-r-emerald-500" : "border-r-rose-400")} ${lockedByOther ? "opacity-70 ring-2 ring-amber-300" : ""}`}>

        {/* السطر 1: هوية بارزة + حالة ثابتة في الزاوية */}
        <div className="flex items-start gap-3">
          <div className={`relative grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black text-white ${avatarColor(c.key, online)}`}>
            {initials}
            <span className={`absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-white ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-black leading-tight text-slate-900">{c.name ?? c.email ?? "زائر"}</h2>
            <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-slate-500" dir="ltr">{c.phone ?? c.email ?? "—"}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-black ${tone.idle}`} title={st?.label ?? "بدون طلب"}>
              <StIcon className="size-3" />{st?.label ?? "بدون طلب"}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-slate-600 tabular-nums">{ago(c.lastAt)}</span>
          </div>
        </div>

        {/* السطر 2: الحالة الحيّة الأساسية (التوجيه الحالي والصفحة الحيّة) */}
        {(routeTone || livePage || (lockedByOther && claimedBy)) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {routeTone && (
              <span className={`rounded-xl border px-2.5 py-1 text-[11px] font-black ${routeTone.badge}`} title={`وُجّه إلى: ${routeTone.label}`}>
                {routeTone.label}
              </span>
            )}
            {livePage && (
              <span className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700" title={`يتصفح الآن: ${pageLabels[livePage.page] ?? livePage.page}`}>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                {pageLabels[livePage.page] ?? livePage.page}
              </span>
            )}
            {!livePage && c.page && (
              <span className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500" title="آخر صفحة معروفة">
                <MapPin className="size-3 shrink-0" />{pageLabels[c.page] ?? c.page}
              </span>
            )}
            {lockedByOther && claimedBy && (
              <span className="ms-auto flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 animate-pulse" title={`مفتوحة لدى ${claimedBy}`}>
                <Lock className="size-3 shrink-0" />
              </span>
            )}
          </div>
        )}

        {/* السطر 3: meta ثانوية — صغيرة ومُطفأة، لا تزاحم الرئيسي */}
        {metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[10.5px] font-bold">
            {metaItems}
          </div>
        )}

        {sentToLogout && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5" onClick={(e) => e.stopPropagation()}>
            {logoutConfirmed ? (
              <span className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700">
                <Check className="size-3.5" strokeWidth={3} />سجّل خروجه من الأجهزة
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 text-[10.5px] font-black text-amber-700">وُجّه لتسجيل الخروج</span>
                {onConfirmLogout && (
                  <span role="button" tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onConfirmLogout(); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onConfirmLogout(); } }}
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm transition active:scale-95 hover:bg-emerald-700">
                    <Check className="size-3.5" strokeWidth={3} />تم تسجيل الخروج
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

// البطاقة لا تُعاد رسمتها إلا إذا تغيّر شيء مرئي فعلاً — يمنع إعادة رسم القائمة كاملة
// مع كل إشارة تحديث لحظية.
const sameLive = (a?: { page: string; at: string; sinceAt?: string } | null, b?: { page: string; at: string; sinceAt?: string } | null) =>
  (!a && !b) || (!!a && !!b && a.page === b.page && a.at === b.at && a.sinceAt === b.sinceAt);

export const CustomerRow = memo(CustomerRowBase, (p, n) =>
  p.c.key === n.c.key &&
  p.c.lastAt === n.c.lastAt &&
  p.c.count === n.c.count &&
  p.c.name === n.c.name &&
  p.c.email === n.c.email &&
  p.c.phone === n.c.phone &&
  p.c.page === n.c.page &&
  p.c.subs.length === n.c.subs.length &&
  p.c.subs[0]?.id === n.c.subs[0]?.id &&
  p.c.request?.status === n.c.request?.status &&
  p.online === n.online &&
  sameLive(p.livePage, n.livePage) &&
  p.sentToLogout === n.sentToLogout &&
  p.logoutConfirmed === n.logoutConfirmed &&
  p.actedRoute === n.actedRoute &&
  p.actedActor === n.actedActor &&
  p.claimedBy === n.claimedBy &&
  p.lockedByOther === n.lockedByOther &&
  p.compact === n.compact &&
  p.onOpen === n.onOpen &&
  p.onConfirmLogout === n.onConfirmLogout &&
  p.onSwipeAccept === n.onSwipeAccept &&
  p.onSwipeReject === n.onSwipeReject,
);

const FILTER_LS_KEY = "sham_dash_filter";

export function usePersistedState<T extends string | boolean>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [v, setV] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      if (typeof initial === "boolean") return (raw === "1") as T;
      return raw as T;
    } catch { return initial; }
  });
  useEffect(() => {
    try {
      const out = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
      window.localStorage.setItem(key, out);
    } catch { /* ignore */ }
  }, [key, v]);
  return [v, setV];
}

export const EMPTY_KEYS: Set<string> = new Set();

export function useCustomerFilter(customers: Customer[], onlineKeys: Set<string>, actedKeys: Set<string> = EMPTY_KEYS, otpKeys: Set<string> = EMPTY_KEYS) {
  const [query, setQuery] = useState("");
  const [rawFilter, setFilter] = usePersistedState<string>(FILTER_LS_KEY, "all");
  // فلتر محفوظ قديم/غير معروف يرجع إلى «الكل» بدل قائمة فارغة
  const filter = FILTERS.some((f) => f.key === rawFilter) ? rawFilter : "all";
  const dq = useDeferredValue(query.trim().toLowerCase());
  const list = useMemo(() => customers.filter((c) => matchCustomer(c, filter, dq, onlineKeys, actedKeys, otpKeys)), [customers, filter, dq, onlineKeys, actedKeys, otpKeys]);
  return { query, setQuery, filter, setFilter, list };
}
