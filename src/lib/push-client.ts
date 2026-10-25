import { getVapidPublicKey, savePushSubscription, deletePushSubscription } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function currentPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "default";
  return Notification.permission;
}

async function registerSW(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // انتظر أن يصبح العامل مُفعَّلاً فعلياً قبل الاشتراك (iOS/Safari حسّاس لذلك)
  if (!reg.active) {
    await new Promise<void>((resolve) => {
      const check = () => {
        if (reg!.active) { resolve(); return true; }
        return false;
      };
      if (check()) return;
      const sw = reg!.installing ?? reg!.waiting;
      if (sw) sw.addEventListener("statechange", () => { if (sw.state === "activated") resolve(); });
      // حد زمني أقصى حتى لا نعلق
      setTimeout(resolve, 4000);
    });
  }
  try { await navigator.serviceWorker.ready; } catch { /* ignore */ }
  return reg;
}

/** تسجيل مبكر لعامل الخدمة (يُستدعى من اللوحة عند التحميل) حتى يكون جاهزاً للاشتراك فور الضغط. */
export async function ensureServiceWorker(): Promise<void> {
  if (!isPushSupported()) return;
  try { await registerSW(); } catch { /* ignore */ }
}

function guessDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "متصفح";
}

export async function enableBackgroundNotifications(): Promise<
  { ok: true; endpoint: string } | { ok: false; reason: string }
> {
  try {
    if (!isPushSupported()) return { ok: false, reason: "المتصفح لا يدعم الإشعارات في الخلفية" };
    if (typeof window !== "undefined" && !(window.isSecureContext || window.location.hostname === "localhost")) {
      return { ok: false, reason: "الإشعارات تتطلب اتصال HTTPS" };
    }
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm === "denied") return { ok: false, reason: "الإذن مرفوض — افتح إعدادات الموقع واسمح بالإشعارات" };
    if (perm !== "granted") return { ok: false, reason: "لم يتم منح إذن الإشعارات" };
    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) return { ok: false, reason: "مفاتيح VAPID غير مضبوطة على الخادم" };
    const reg = await registerSW();
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // Rotate if the key changed
      const current = sub.options?.applicationServerKey;
      const expected = urlBase64ToUint8Array(publicKey);
      const same =
        current && new Uint8Array(current as ArrayBuffer).length === expected.length &&
        new Uint8Array(current as ArrayBuffer).every((b, i) => b === expected[i]);
      if (!same) { try { await sub.unsubscribe(); } catch (_) {} sub = null; }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, reason: "اشتراك غير مكتمل" };
    await savePushSubscription({
      data: {
        subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        deviceLabel: guessDeviceLabel(),
        userAgent: navigator.userAgent,
      },
    });
    return { ok: true, endpoint: json.endpoint };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    const name = err?.name ?? "";
    const msg = err?.message ?? String(e);
    if (name === "NotAllowedError") return { ok: false, reason: "رفض المتصفح الاشتراك — تأكد من الإذن وأن الصفحة مفتوحة من أيقونة الشاشة الرئيسية على الآيفون" };
    if (name === "AbortError") return { ok: false, reason: "تم إلغاء التسجيل — أعد المحاولة بعد لحظة" };
    if (name === "InvalidStateError") return { ok: false, reason: "عامل الخدمة غير مُفعَّل بعد — أعد تحميل الصفحة ثم جرّب مجدداً" };
    return { ok: false, reason: `تعذّر التفعيل: ${msg}` };
  }
}

export async function disableBackgroundNotifications(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch (_) {}
    try { await deletePushSubscription({ data: { endpoint } }); } catch (_) {}
  }
}

export async function currentEndpoint(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}
