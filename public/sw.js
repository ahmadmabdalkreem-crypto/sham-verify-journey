/* Sham Verify — background push service worker */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* قراءة تفضيلات أنواع الإشعارات من IndexedDB (نفس المخطط في src/lib/push-prefs.ts). */
const PREFS_DB = "sham-dash-prefs";
const PREFS_STORE = "kv";
const PREFS_KEY = "push-kinds";
const ALL_KINDS = [
  "login_attempt","signup","otp_attempt","otp_opened","otp_typing","otp_resend",
  "verify_personal","verify_documents","verify_submit","logout_confirmed","customer_info",
];
function getEnabledKindsSW() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PREFS_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PREFS_STORE)) db.createObjectStore(PREFS_STORE);
      };
      req.onerror = () => resolve(ALL_KINDS);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(PREFS_STORE, "readonly");
          const r = tx.objectStore(PREFS_STORE).get(PREFS_KEY);
          r.onsuccess = () => resolve(Array.isArray(r.result) ? r.result : ALL_KINDS);
          r.onerror = () => resolve(ALL_KINDS);
        } catch (_) { resolve(ALL_KINDS); }
      };
    } catch (_) { resolve(ALL_KINDS); }
  });
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    try { data = { title: "إشعار", body: event.data ? event.data.text() : "" }; } catch (__) { data = {}; }
  }

  const title = data.title || "لوحة التحكم";
  const body = data.body || "";
  const url = data.url || "/dashboard";
  const tag = data.tag || (data.key ? `sham-${data.key}` : `sham-${Date.now()}`);
  // النوع هو جزء التاغ قبل أول «:» (مثلاً "otp_attempt:xxxx").
  const kind = typeof tag === "string" && tag.includes(":") ? tag.split(":")[0] : "";

  const options = {
    body,
    tag,
    renotify: true,
    dir: "rtl",
    lang: "ar",
    badge: "/favicon.png",
    icon: "/favicon.png",
    data: { url, kind },
    requireInteraction: false,
  };

  event.waitUntil((async () => {
    // تخطَّ الأنواع التي أوقفها المستخدم من الإعدادات (نسمح دائماً بالاختبار والبث اليدوي).
    if (kind && ALL_KINDS.includes(kind)) {
      const enabled = await getEnabledKindsSW();
      if (!enabled.includes(kind)) return;
    }
    // If a dashboard tab is already visible, skip the OS notification to avoid duplicates
    try {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const dashVisible = clientsList.some((c) => {
        try {
          const u = new URL(c.url);
          return u.pathname.startsWith("/dashboard") && c.visibilityState === "visible";
        } catch (_) { return false; }
      });
      if (dashVisible) return;
    } catch (_) {}
    await self.registration.showNotification(title, options);
  })());
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        try {
          const u = new URL(c.url);
          if (u.pathname.startsWith("/dashboard")) {
            await c.focus();
            try { c.navigate(targetUrl); } catch (_) { /* older browsers */ }
            return;
          }
        } catch (_) {}
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (!sub) return;
        await fetch("/api/public/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), renewed: true }),
        });
      } catch (_) {}
    })(),
  );
});

/* ---------- Offline support (customer pages only) ---------- */
const OFFLINE_CACHE = "sham-offline-v1";
const OFFLINE_SKIP = /^\/(dashboard|admin|api|_serverFn|~oauth)/;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  if (OFFLINE_SKIP.test(url.pathname) || url.pathname.includes("_serverFn")) return;

  // Pages: network first, fall back to last saved copy
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(OFFLINE_CACHE); c.put(req, res.clone()); }
        return res;
      } catch (_) {
        const c = await caches.open(OFFLINE_CACHE);
        return (await c.match(req, { ignoreSearch: true })) || (await c.match("/")) ||
          new Response("<meta charset=utf-8><body dir=rtl style='background:#0d1117;color:#e2e8f0;font-family:sans-serif;text-align:center;padding-top:30vh'>لا يوجد اتصال بالإنترنت. أعد المحاولة عند عودة الاتصال.", { headers: { "content-type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }

  // Static files (scripts, styles, images, fonts): cache first
  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const c = await caches.open(OFFLINE_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
  }
});
