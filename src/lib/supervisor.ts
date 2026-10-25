// اسم المشرف لكل جهاز (محفوظ في localStorage) ليظهر على بطاقات العملاء
// الذين وجّههم. يُطلب مرّة عند فتح اللوحة، ويمكن تغييره لاحقاً.
import { useEffect, useState } from "react";

const KEY = "sham_dash_supervisor";
const EV = "sham-supervisor-change";

export function getSupervisor(): string {
  if (typeof window === "undefined") return "";
  try { return (localStorage.getItem(KEY) ?? "").trim(); } catch { return ""; }
}
export function setSupervisor(name: string) {
  const v = name.trim().slice(0, 40);
  try {
    if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EV));
  } catch { /* ignore */ }
}
export function useSupervisor(): [string, (v: string) => void] {
  const [v, setV] = useState<string>(() => getSupervisor());
  useEffect(() => {
    const sync = () => setV(getSupervisor());
    window.addEventListener(EV, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EV, sync); window.removeEventListener("storage", sync); };
  }, []);
  return [v, (name: string) => { setSupervisor(name); setV(getSupervisor()); }];
}

export function promptSupervisor(current = ""): string | null {
  if (typeof window === "undefined") return null;
  const r = window.prompt("أدخل اسم المشرف (يظهر على بطاقات العملاء الذين توجّههم):", current);
  if (r === null) return null;
  const t = r.trim().slice(0, 40);
  return t || null;
}
