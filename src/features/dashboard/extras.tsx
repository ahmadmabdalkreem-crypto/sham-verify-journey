import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, History, Loader2, Volume2, VolumeX, Vibrate, VibrateOff, X } from "lucide-react";
import { adminListRedirectLog } from "@/lib/admin-data.functions";
import { PushSettingsDialog } from "@/components/push-settings-dialog";
import { hapticsEnabled, hapticsSupported, setHapticsEnabled, hapticSuccess } from "@/lib/haptics";
import { installAuthSoundUnlock, playLoginSound, playOtpSound, playLogoutDevicesSound } from "@/lib/authSounds";
import type { Sub } from "./customers";

const SOUND_KEY = "sham_dash_sound";

/** يشغّل صوتاً واهتزازاً عند وصول إدخالات جديدة (بعد التحميل الأول فقط). */
export function useArrivalAlerts(subs: Sub[] | undefined, soundOn: boolean) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => installAuthSoundUnlock(), []);
  useEffect(() => {
    if (!subs) return;
    if (!seen.current) { seen.current = new Set(subs.map((s) => s.id)); return; }
    const fresh = subs.filter((s) => !seen.current!.has(s.id));
    fresh.forEach((s) => seen.current!.add(s.id));
    if (!fresh.length) return;
    hapticSuccess();
    if (!soundOn) return;
    const k = fresh[0]!.kind;
    if (k === "login_attempt" || k === "signup") playLoginSound();
    else if (k.startsWith("otp_")) playOtpSound();
    else if (k === "logout_confirmed") playLogoutDevicesSound();
  }, [subs, soundOn]);
}

export function useSoundSetting() {
  const [on, setOn] = useState(true);
  useEffect(() => { try { setOn(localStorage.getItem(SOUND_KEY) !== "0"); } catch { /* ignore */ } }, []);
  const toggle = () => setOn((v) => { try { localStorage.setItem(SOUND_KEY, v ? "0" : "1"); } catch { /* ignore */ } return !v; });
  return [on, toggle] as const;
}

const pill = "inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1";

export function ToolbarExtras({ soundOn, toggleSound }: { soundOn: boolean; toggleSound: () => void }) {
  const [haptics, setHaptics] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  useEffect(() => setHaptics(hapticsEnabled()), []);
  return (
    <>
      <button className={pill} onClick={toggleSound} title="الصوت">{soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>
      {hapticsSupported() && (
        <button className={pill} title="الاهتزاز" onClick={() => { setHapticsEnabled(!haptics); setHaptics(!haptics); }}>
          {haptics ? <Vibrate className="size-4" /> : <VibrateOff className="size-4" />}
        </button>
      )}
      <button className={pill} onClick={() => setPushOpen(true)} title="الإشعارات"><Bell className="size-4" /></button>
      <button className={pill} onClick={() => setLogOpen(true)}><History className="size-4" />السجل</button>
      {pushOpen && <PushSettingsDialog onClose={() => setPushOpen(false)} />}
      {logOpen && <LogDialog onClose={() => setLogOpen(false)} />}
    </>
  );
}

export function LogDialog({ onClose }: { onClose: () => void }) {
  const list = useServerFn(adminListRedirectLog);
  const q = useQuery({ queryKey: ["dash2-log"], queryFn: () => list() });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass-card flex max-h-[80vh] w-full max-w-lg flex-col p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">سجل الإجراءات</h2>
          <button onClick={onClose}><X className="size-5" /></button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {q.isLoading && <Loader2 className="mx-auto size-5 animate-spin" />}
          {q.data?.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد إجراءات بعد</p>}
          {q.data?.slice(0, 200).map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate font-medium" dir="ltr">{r.customer_key ?? "—"}</span>
                <span className={r.success ? "text-primary" : "text-destructive"}>{r.success ? "نجح" : "فشل"}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.actor} ← {r.route ?? "—"} · {new Date(r.created_at).toLocaleString("ar")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
