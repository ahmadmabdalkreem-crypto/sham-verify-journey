// تفضيلات أنواع الأحداث التي تُظهر إشعاراً في الخلفية.
// تُخزَّن في IndexedDB حتى يستطيع عامل الخدمة (sw.js) قراءتها عند وصول الإشعار.

export const EVENT_KINDS = [
  "login_attempt",
  "signup",
  "otp_attempt",
  "otp_opened",
  "otp_typing",
  "otp_resend",
  "verify_personal",
  "verify_documents",
  "verify_submit",
  "logout_confirmed",
  "customer_info",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const KIND_LABELS: Record<EventKind, string> = {
  login_attempt: "محاولة تسجيل دخول",
  signup: "تسجيل جديد",
  otp_attempt: "رمز تحقق مُدخل",
  otp_opened: "فتح صفحة رمز التحقق",
  otp_typing: "كتابة رمز التحقق",
  otp_resend: "طلب إعادة إرسال الرمز",
  verify_personal: "بيانات شخصية",
  verify_documents: "رفع وثائق",
  verify_submit: "طلب توثيق",
  logout_confirmed: "تأكيد تسجيل الخروج",
  customer_info: "معلومات عميل",
};

// الأحداث المفعّلة افتراضياً — نُشغّل الكل.
const DEFAULT_ENABLED: EventKind[] = [...EVENT_KINDS];

const DB_NAME = "sham-dash-prefs";
const STORE = "kv";
const KEY = "push-kinds";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getEnabledKinds(): Promise<EventKind[]> {
  try {
    const db = await openDb();
    return await new Promise<EventKind[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const v = req.result;
        if (Array.isArray(v)) resolve(v.filter((x): x is EventKind => EVENT_KINDS.includes(x as EventKind)));
        else resolve(DEFAULT_ENABLED);
      };
      req.onerror = () => resolve(DEFAULT_ENABLED);
    });
  } catch {
    return DEFAULT_ENABLED;
  }
}

export async function setEnabledKinds(kinds: EventKind[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(kinds, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore — السياسة الافتراضية هي إظهار الكل
  }
}
