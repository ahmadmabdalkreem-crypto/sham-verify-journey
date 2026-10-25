import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [back, setBack] = useState(false);
  useEffect(() => {
    setOffline(!navigator.onLine);
    const off = () => { setOffline(true); setBack(false); };
    const on = () => { setOffline(false); setBack(true); setTimeout(() => setBack(false), 3000); };
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);
  if (!offline && !back) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border border-border bg-card/95 px-4 py-2.5 text-center text-[13px] font-semibold text-foreground shadow-lg backdrop-blur">
      {offline ? <WifiOff className="size-4 shrink-0 text-warning" /> : <Wifi className="size-4 shrink-0 text-accent" />}
      {offline ? "أنت غير متصل — تعرض الآن آخر نسخة محفوظة، وبياناتك تُحفظ على جهازك" : "عاد الاتصال — تمت المزامنة"}
    </div>
  );
}
