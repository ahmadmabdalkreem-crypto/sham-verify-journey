import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Download, RefreshCw } from "lucide-react";
import type { Req, Sub } from "./customers";
import { LogDialog } from "./extras";

function secondsAgo(iso?: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `منذ ${s} ث`;
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return `منذ ${Math.floor(s / 86400)} ي`;
}

function latest<T>(arr: T[] | undefined, pick: (t: T) => string): string | null {
  if (!arr?.length) return null;
  let best = pick(arr[0]!);
  for (const x of arr) { const v = pick(x); if (v > best) best = v; }
  return best;
}

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

export function LiveToolbar({ reqs, subs, online, refreshing, onRefresh }: {
  reqs: Req[] | undefined; subs: Sub[] | undefined;
  online: boolean; refreshing: boolean; onRefresh: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  useEffect(() => { const t = setInterval(() => setTick((v) => v + 1), 5000); return () => clearInterval(t); }, []);
  void tick;

  const total = reqs?.length ?? null;
  const latestReq = latest(reqs, (r) => r.created_at);
  const latestSub = latest(subs, (s) => s.created_at);
  const actionSubs = subs?.filter((s) => s.kind === "admin_action" || s.kind === "redirect");
  const latestAction = latest(actionSubs, (s) => s.created_at);

  const chip = "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-all";
  const neutral = `${chip} border border-slate-200/60 bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95`;
  const soft = `${chip} bg-slate-50 text-slate-500 hover:bg-slate-100`;

  return (
    <>
      <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm" dir="rtl">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className={`${chip} border ${online ? "border-emerald-200 bg-emerald-100/80 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
            <span className={`size-2 rounded-full ${online ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
            <span>مباشر الآن</span>
          </span>
          <span className={neutral}>إجمالي: {total ?? "—"} طلب</span>
          <button onClick={onRefresh} className={neutral}>
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /><span>تحديث</span>
          </button>
          <button onClick={() => reqs && downloadJson("requests", reqs)} disabled={!reqs?.length} className={`${neutral} disabled:opacity-50`}>
            <Download className="size-3.5" /><span>الطلبات</span>
          </button>
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-2.5 pb-1">
          <span className={soft}>
            <CheckCircle2 className="size-3.5 text-emerald-500" /><span>الطلبات • {secondsAgo(latestReq)}</span>
          </span>
          <span className={soft}>
            <CheckCircle2 className="size-3.5 text-emerald-500" /><span>الإدخالات • {secondsAgo(latestSub)}</span>
          </span>
          <span className={soft}>
            <CheckCircle2 className="size-3.5 text-emerald-500" /><span>الإجراءات • {secondsAgo(latestAction)}</span>
          </span>
          <button onClick={() => setLogOpen(true)} className={soft}>
            <Circle className="size-3.5 text-slate-400" /><span>سجل الأحداث</span>
          </button>
        </div>
      </div>
      {logOpen && <LogDialog onClose={() => setLogOpen(false)} />}
    </>
  );
}
