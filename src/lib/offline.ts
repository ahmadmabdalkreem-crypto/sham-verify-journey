/** Registers the site worker for offline use — production only, never in preview/editor. */
export function setupOffline() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const h = location.hostname;
  let inFrame = false;
  try { inFrame = window.self !== window.top; } catch { inFrame = true; }
  const blocked =
    !import.meta.env.PROD || inFrame ||
    h.startsWith("id-preview--") || h.startsWith("preview--") ||
    /(^|\.)lovableproject(-dev)?\.com$/.test(h) || /(^|\.)beta\.lovable\.dev$/.test(h) ||
    new URLSearchParams(location.search).get("sw") === "off";
  if (blocked) {
    navigator.serviceWorker.getRegistrations().then((rs) =>
      rs.forEach((r) => r.active?.scriptURL.endsWith("/sw.js") && r.unregister()),
    );
    return;
  }
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
}
