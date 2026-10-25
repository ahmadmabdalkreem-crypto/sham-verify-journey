import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Loader2, Smartphone, Trash2, X, Send, CheckCircle2, XCircle, Activity } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  currentEndpoint,
  currentPermission,
  disableBackgroundNotifications,
  enableBackgroundNotifications,
  isPushSupported,
} from "@/lib/push-client";
import { deletePushSubscription, getVapidPublicKey, listPushDevices, sendTestPush } from "@/lib/push.functions";
import { EVENT_KINDS, KIND_LABELS, getEnabledKinds, setEnabledKinds, type EventKind } from "@/lib/push-prefs";

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

type Diag = {
  supported: boolean;
  secure: boolean;
  swActive: boolean;
  vapidOk: boolean;
  perm: NotificationPermission;
  endpoint: string | null;
  registered: boolean;
};

export function PushSettingsDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supported, setSupported] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);

  const refresh = useCallback(async () => {
    const sup = isPushSupported();
    const p = currentPermission();
    const ep = await currentEndpoint();
    setSupported(sup);
    setPerm(p);
    setEndpoint(ep);
    let swActive = false;
    try {
      const reg = typeof navigator !== "undefined" && "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration("/sw.js")
        : null;
      swActive = Boolean(reg?.active);
    } catch { /* ignore */ }
    let vapidOk = false;
    try { vapidOk = Boolean((await getVapidPublicKey()).publicKey); } catch { /* ignore */ }
    const secure = typeof window !== "undefined"
      ? window.isSecureContext || window.location.hostname === "localhost"
      : false;
    setDiag({ supported: sup, secure, swActive, vapidOk, perm: p, endpoint: ep, registered: false });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const devices = useQuery({
    queryKey: ["push-devices"],
    queryFn: () => listPushDevices(),
    staleTime: 10_000,
  });

  const enabled = Boolean(endpoint) && perm === "granted";
  const iosNeedsInstall = isIosSafari() && !isStandalone();

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disableBackgroundNotifications();
        toast.success("تم إيقاف الإشعارات في الخلفية على هذا الجهاز");
      } else {
        const r = await enableBackgroundNotifications();
        if (r.ok) toast.success("تم تفعيل الإشعارات في الخلفية على هذا الجهاز");
        else toast.error(r.reason);
      }
      await refresh();
      await qc.invalidateQueries({ queryKey: ["push-devices"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`تعذّر تغيير حالة الإشعارات: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  // Auto-complete subscription when permission is already granted but no endpoint yet.
  useEffect(() => {
    if (!supported) return;
    if (perm !== "granted") return;
    if (endpoint) return;
    if (busy) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const r = await enableBackgroundNotifications();
        if (!cancelled) {
          if (r.ok) toast.success("تم إكمال اشتراك الإشعارات تلقائياً");
          else toast.error(`تعذّر إكمال الاشتراك: ${r.reason}`);
          await refresh();
          await qc.invalidateQueries({ queryKey: ["push-devices"] });
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(`تعذّر إكمال الاشتراك: ${msg}`);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, perm, endpoint]);

  const test = async () => {
    setTesting(true);
    try {
      const r = await sendTestPush({});
      toast.success(`أُرسل إشعار تجريبي إلى ${r.sent} جهاز`);
      if (r.removed > 0) await qc.invalidateQueries({ queryKey: ["push-devices"] });
    } catch {
      toast.error("تعذّر إرسال الإشعار التجريبي");
    } finally {
      setTesting(false);
    }
  };

  const removeDevice = async (ep: string) => {
    try {
      await deletePushSubscription({ data: { endpoint: ep } });
      await qc.invalidateQueries({ queryKey: ["push-devices"] });
      await refresh();
      toast.success("تم حذف الجهاز");
    } catch {
      toast.error("تعذّر حذف الجهاز");
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Bell className="size-4.5 text-blue-600" />
          <h3 className="text-sm font-black text-slate-900">🔔 الإشعارات في الخلفية</h3>
          <button
            className="ms-auto rounded-full p-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {!supported ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">
              هذا المتصفح لا يدعم الإشعارات في الخلفية.
            </p>
          ) : null}

          {iosNeedsInstall ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200">
              على الآيفون: افتح قائمة المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح اللوحة من الأيقونة، ثم فعّل
              الإشعارات من هنا.
            </p>
          ) : null}

          {/* خطوة واحدة كبيرة */}
          {enabled ? (
            <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
              <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
              <p className="mt-1.5 text-[14px] font-black text-emerald-800">الإشعارات مفعّلة على هذا الجهاز</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-emerald-700">
                ستصلك التنبيهات حتى لو كانت اللوحة مغلقة.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={testing}
                  onClick={test}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[12px] font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  جرّب إشعاراً الآن
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggle}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-extrabold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <BellOff className="size-3.5" />}
                  إيقاف
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-50 p-4 text-center ring-1 ring-blue-200">
              <Bell className="mx-auto size-7 text-blue-600" />
              <p className="mt-1.5 text-[14px] font-black text-slate-900">فعّل الإشعارات بضغطة واحدة</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-slate-600">
                {perm === "denied"
                  ? "الإذن مرفوض من المتصفح — افتح إعدادات الموقع واسمح بالإشعارات ثم أعد المحاولة."
                  : iosNeedsInstall
                    ? "على الآيفون: «إضافة إلى الشاشة الرئيسية» أولاً، ثم افتح اللوحة من الأيقونة واضغط الزر."
                    : "سيطلب المتصفح الإذن، ثم نُكمل كل شيء تلقائياً."}
              </p>
              <button
                type="button"
                disabled={busy || !supported || perm === "denied"}
                onClick={toggle}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[14px] font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                {busy ? "جارٍ التفعيل…" : "تفعيل الإشعارات الآن"}
              </button>
            </div>
          )}

          <details className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 open:pb-1">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-[12px] font-extrabold text-slate-700">
              ⚙️ خيارات متقدّمة (الفحص، أنواع الإشعارات، الأجهزة)
            </summary>
            <div className="space-y-3 px-3 pb-2">
          <DiagnosticsPanel
            diag={diag}
            registered={Boolean(endpoint && (devices.data ?? []).some((d) => d.endpoint === endpoint))}
          />

          <KindsPicker />


          <div>
            <p className="mb-2 text-[12px] font-extrabold text-slate-900">
              الأجهزة المسجّلة {devices.data ? `(${devices.data.length})` : ""}
            </p>
            {devices.isLoading ? (
              <div className="space-y-2">
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : (devices.data ?? []).length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 ring-1 ring-slate-200">
                لا توجد أجهزة مسجّلة بعد.
              </p>
            ) : (
              <ul className="space-y-2">
                {(devices.data ?? []).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                  >
                    <Smartphone className="size-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-slate-900">
                        {d.device_label ?? "جهاز"}
                        {d.endpoint === endpoint ? (
                          <span className="ms-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                            هذا الجهاز
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {new Date(d.created_at).toLocaleString("ar")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeDevice(d.endpoint)}
                      aria-label="حذف الجهاز"
                      className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function KindsPicker() {
  const [enabled, setEnabled] = useState<EventKind[] | null>(null);
  useEffect(() => { void getEnabledKinds().then(setEnabled); }, []);
  const toggle = async (k: EventKind) => {
    const base = enabled ?? [...EVENT_KINDS];
    const next = base.includes(k) ? base.filter((x) => x !== k) : [...base, k];
    setEnabled(next);
    await setEnabledKinds(next);
  };
  const setAll = async (on: boolean) => {
    const next = on ? [...EVENT_KINDS] : [];
    setEnabled(next);
    await setEnabledKinds(next);
  };
  const list = enabled ?? [...EVENT_KINDS];
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[12px] font-extrabold text-slate-900">أنواع الإشعارات المسموح بها</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => void setAll(true)} className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">الكل</button>
          <button type="button" onClick={() => void setAll(false)} className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">لا شيء</button>
        </div>
      </div>
      <p className="mb-2 text-[10px] text-slate-500">يُطبَّق على هذا الجهاز فقط. يسري فوراً دون إعادة تحميل.</p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {EVENT_KINDS.map((k) => {
          const on = list.includes(k);
          return (
            <li key={k}>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-[12px] ring-1 ring-slate-200 hover:bg-slate-50">
                <input type="checkbox" checked={on} onChange={() => void toggle(k)} className="size-4 accent-blue-600" />
                <span className="font-semibold text-slate-800">{KIND_LABELS[k]}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <li className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[11.5px] font-bold ${ok ? "text-slate-800" : "text-rose-700"}`}>{label}</p>
        {hint && !ok ? <p className="text-[10.5px] text-slate-500">{hint}</p> : null}
      </div>
    </li>
  );
}

function DiagnosticsPanel({ diag, registered }: { diag: Diag | null; registered: boolean }) {
  if (!diag) return null;
  const allOk = diag.supported && diag.secure && diag.swActive && diag.vapidOk && diag.perm === "granted" && Boolean(diag.endpoint) && registered;
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center gap-2">
        <Activity className={`size-4 ${allOk ? "text-emerald-600" : "text-amber-600"}`} />
        <p className="text-[12px] font-extrabold text-slate-900">فحص الإشعارات في الخلفية</p>
        <span className={`ms-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold ${allOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {allOk ? "جاهزة" : "يحتاج خطوة"}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <Row ok={diag.supported} label="دعم المتصفح" hint="المتصفح لا يدعم Push؛ جرّب Chrome/Safari حديث." />
        <Row ok={diag.secure} label="اتصال آمن (HTTPS)" hint="الإشعارات تعمل على HTTPS أو localhost فقط." />
        <Row ok={diag.swActive} label="عامل الخدمة مُفعَّل" hint="لم يُسجَّل بعد — اضغط «تفعيل»." />
        <Row ok={diag.vapidOk} label="مفاتيح VAPID موجودة" hint="المفاتيح غير مضبوطة على الخادم." />
        <Row ok={diag.perm === "granted"} label="إذن الإشعارات مُمنوح" hint={diag.perm === "denied" ? "الإذن مرفوض — افتح إعدادات الموقع واسمح به." : "لم يُطلب بعد — اضغط «تفعيل»."} />
        <Row ok={Boolean(diag.endpoint)} label="اشتراك Push جاهز" hint="لا يوجد اشتراك — اضغط «تفعيل»." />
        <Row ok={registered} label="الجهاز محفوظ على الخادم" hint="لم يُسجَّل بعد في قاعدة البيانات." />
      </ul>
    </div>
  );
}

