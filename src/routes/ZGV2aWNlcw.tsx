import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Loader2, Smartphone, Trash2, Send, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";
import { isAdminUnlocked } from "@/lib/admin-gate.functions";
import { DashGate } from "@/features/dashboard/gate";
import { listPushDevices, deletePushSubscription, sendTestPush } from "@/lib/push.functions";

export const Route = createFileRoute("/ZGV2aWNlcw")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "إدارة أجهزة الإشعارات | شام كاش" },
      { name: "description", content: "عرض وإدارة الأجهزة المسجّلة لاستقبال الإشعارات في الخلفية." },
      { property: "og:title", content: "إدارة أجهزة الإشعارات" },
      { property: "og:description", content: "إلغاء اشتراك الأجهزة وفحص آخر وصول للإشعارات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const gate = useQuery({ queryKey: ["admin-unlocked"], queryFn: () => isAdminUnlocked(), staleTime: 60000 });
  if (gate.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (gate.data?.unlocked !== true) return <DashGate onUnlocked={(u) => qc.setQueryData(["admin-unlocked"], { unlocked: true, username: u })} />;
  return <DevicesPage />;
}

type TestResult = {
  total: number; sent: number; failed: number; removed: number;
  results: Array<{ id: string; label: string | null; ok: boolean; status?: number; removed?: boolean }>;
};

function DevicesPage() {
  const qc = useQueryClient();
  const devices = useQuery({ queryKey: ["push-devices"], queryFn: () => listPushDevices(), refetchInterval: 15000 });
  const [testing, setTesting] = useState<string | "all" | null>(null);
  const [lastResult, setLastResult] = useState<(TestResult & { scope: string; at: number }) | null>(null);

  const sendAll = async () => {
    setTesting("all");
    try {
      const r = (await sendTestPush({})) as TestResult;
      setLastResult({ ...r, scope: "جميع الأجهزة", at: Date.now() });
      await qc.invalidateQueries({ queryKey: ["push-devices"] });
      if (r.sent > 0) toast.success(`وصل الإشعار إلى ${r.sent} من ${r.total}`);
      else toast.error("لم يصل الإشعار إلى أي جهاز");
    } catch (e) {
      toast.error(`تعذّر الإرسال: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setTesting(null); }
  };
  const sendOne = async (ep: string, label: string) => {
    setTesting(ep);
    try {
      const r = (await sendTestPush({ data: { endpoint: ep } })) as TestResult;
      setLastResult({ ...r, scope: label, at: Date.now() });
      await qc.invalidateQueries({ queryKey: ["push-devices"] });
      if (r.sent > 0) toast.success(`✅ وصل الإشعار إلى «${label}»`);
      else toast.error(`✗ لم يصل الإشعار إلى «${label}»`);
    } catch (e) {
      toast.error(`تعذّر الإرسال: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setTesting(null); }
  };
  const remove = async (ep: string, label: string) => {
    if (!confirm(`إلغاء اشتراك «${label}»؟`)) return;
    try {
      await deletePushSubscription({ data: { endpoint: ep } });
      await qc.invalidateQueries({ queryKey: ["push-devices"] });
      toast.success("تم إلغاء اشتراك الجهاز");
    } catch { toast.error("تعذّر الحذف"); }
  };

  const list = devices.data ?? [];
  const resultById = new Map(lastResult?.results.map((r) => [r.id, r] as const) ?? []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-20 border-b border-slate-800/50 bg-gradient-to-l from-slate-950 to-slate-900 shadow-md">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-3">
          <Link to="/ZGFzaGJvYXJk" className="grid size-9 place-items-center rounded-xl bg-white/5 text-cyan-200 ring-1 ring-white/10 hover:bg-white/10"><ArrowRight className="size-4" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold bg-gradient-to-l from-cyan-300 to-sky-200 bg-clip-text text-transparent">إدارة أجهزة الإشعارات</h1>
            <p className="truncate text-[10.5px] font-medium text-slate-300">{list.length} جهاز مسجّل</p>
          </div>
          <button onClick={() => devices.refetch()} aria-label="تحديث" className="grid size-9 place-items-center rounded-xl bg-white/5 text-cyan-200 ring-1 ring-white/10 hover:bg-white/10">
            <RefreshCw className={`size-4 ${devices.isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={sendAll} disabled={testing !== null || list.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[12px] font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50">
            {testing === "all" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            إرسال للكل
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-3 py-5">
        {lastResult && <ResultCard r={lastResult} />}

        {devices.isLoading ? (
          <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Bell className="mx-auto size-8 text-slate-400" />
            <p className="mt-2 text-[13px] font-bold text-slate-700">لا توجد أجهزة مسجّلة بعد</p>
            <p className="mt-1 text-[11.5px] text-slate-500">افتح اللوحة على جهازك واضغط «تفعيل الإشعارات» من زر 🔔.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {list.map((d) => {
              const label = d.device_label ?? ua(d.user_agent) ?? "جهاز غير معروف";
              const res = resultById.get(d.id);
              return (
                <li key={d.id} className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"><Smartphone className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-black text-slate-900">{label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">سُجّل: {fmtAr(d.created_at)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {d.last_success_at ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle2 className="size-3" /> آخر نجاح: {fmtAr(d.last_success_at)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-600 ring-1 ring-slate-200">لم يُستقبل بعد</span>
                        )}
                        {d.last_failure_at && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 ring-1 ring-rose-200">
                            <XCircle className="size-3" /> آخر فشل: {fmtAr(d.last_failure_at)}
                          </span>
                        )}
                        {res && (res.ok
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-black text-emerald-700 ring-1 ring-emerald-300">✅ وصل الاختبار</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-black text-rose-700 ring-1 ring-rose-300">✗ فشل {res.status ?? ""}{res.removed ? " — حُذف" : ""}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button onClick={() => sendOne(d.endpoint, label)} disabled={testing !== null}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-cyan-700 disabled:opacity-50">
                        {testing === d.endpoint ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                        اختبار
                      </button>
                      <button onClick={() => remove(d.endpoint, label)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">
                        <Trash2 className="size-3" /> إلغاء
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function ResultCard({ r }: { r: TestResult & { scope: string; at: number } }) {
  const allOk = r.sent === r.total && r.total > 0;
  const tone = allOk ? "emerald" : r.sent > 0 ? "amber" : "rose";
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-800",
    amber: "bg-amber-50 ring-amber-200 text-amber-800",
    rose: "bg-rose-50 ring-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${colors[tone]}`}>
      <div className="flex items-center gap-2">
        {allOk ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
        <p className="text-[13px] font-black">نتيجة آخر إرسال — {r.scope}</p>
        <span className="ms-auto text-[10.5px] opacity-70">{new Date(r.at).toLocaleTimeString("ar")}</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <Stat label="الإجمالي" val={r.total} />
        <Stat label="وصل" val={r.sent} tone="emerald" />
        <Stat label="فشل" val={r.failed} tone="rose" />
        <Stat label="حُذف تلقائياً" val={r.removed} tone="slate" />
      </div>
    </div>
  );
}

function Stat({ label, val, tone = "slate" }: { label: string; val: number; tone?: "emerald" | "rose" | "slate" }) {
  const col = tone === "emerald" ? "text-emerald-700" : tone === "rose" ? "text-rose-700" : "text-slate-700";
  return (
    <div className="rounded-xl bg-white/70 px-2 py-1.5 text-center ring-1 ring-white/60">
      <p className={`text-[18px] font-black ${col}`}>{val}</p>
      <p className="text-[10px] font-bold text-slate-600">{label}</p>
    </div>
  );
}

function fmtAr(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" }); } catch { return iso; }
}

function ua(s: string | null): string | null {
  if (!s) return null;
  if (/iPhone|iPad/i.test(s)) return "آيفون / آيباد";
  if (/Android/i.test(s)) return "أندرويد";
  if (/Mac OS/i.test(s)) return "ماك";
  if (/Windows/i.test(s)) return "ويندوز";
  if (/Linux/i.test(s)) return "لينكس";
  return "متصفح";
}
