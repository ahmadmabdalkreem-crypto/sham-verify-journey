// معرف جلسة فريد ومستمر لكل جهاز — يبقى محفوظاً في localStorage ويلحق بكل إدخال
const KEY = "sham_session_id";

function generate(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `S-${Date.now().toString(36).toUpperCase()}-${rand().toUpperCase()}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let v = window.localStorage.getItem(KEY);
    if (!v) {
      v = generate();
      window.localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return generate();
  }
}
