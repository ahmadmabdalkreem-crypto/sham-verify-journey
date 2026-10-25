import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Volume2, VolumeX, Moon, X } from "lucide-react";
import {
  installSoundUnlock,
  installToastSounds,
  playSound,
  soundForPath,
  updateSoundSettings,
  useSoundSettings,
  type SoundType,
} from "@/lib/sounds";

const CATS: { key: SoundType; label: string }[] = [
  { key: "success", label: "أصوات النجاح" },
  { key: "notification", label: "أصوات الإشعارات" },
  { key: "alert", label: "أصوات التنبيهات" },
  { key: "error", label: "أصوات الأخطاء" },
];

/** مراقبة تيار التنقل/الحالة وتشغيل الصوت المناسب. */
export function useNotificationSound() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== path) {
      const t = soundForPath(path);
      if (t) playSound(t);
    }
    prev.current = path;
  }, [path]);
}

export function SoundControl() {
  const s = useSoundSettings();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (st) => st.location.pathname });
  useNotificationSound();

  useEffect(() => {
    const off = installSoundUnlock();
    void installToastSounds();
    return off;
  }, []);

  // اللوحة الإدارية لها أزرار صوت خاصة بها
  if (path.startsWith("/ZGFzaGJvYXJk") || path.startsWith("/admin")) return null;

  return (
    <div dir="rtl" className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col-reverse items-end">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => updateSoundSettings({ enabled: !s.enabled })}
          onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}
          aria-label={s.enabled ? "الأصوات مفعلة" : "الأصوات مكتومة"}
          title={s.enabled ? "الأصوات مفعلة" : "الأصوات مكتومة"}
          className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition hover:bg-black/60"
        >
          {s.enabled ? <Volume2 className="size-4.5 text-accent" /> : <VolumeX className="size-4.5 text-white/50" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="الأصوات والتنبيهات"
          title="الأصوات والتنبيهات"
          className="flex h-10 items-center rounded-full border border-white/10 bg-black/40 px-3 text-[11px] text-white/70 backdrop-blur-md transition hover:bg-black/60"
        >
          الإعدادات
        </button>
      </div>

      {open && (
        <div className="mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-black/80 p-4 text-right text-sm text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold">الأصوات والتنبيهات</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="text-white/50 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          <label className="flex items-center justify-between py-1.5">
            <span>🔊 تشغيل الأصوات</span>
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.enabled}
              onChange={(e) => updateSoundSettings({ enabled: e.target.checked })} />
          </label>

          <div className="py-2">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span>مستوى الصوت</span>
              <span className="tabular-nums" dir="ltr">{Math.round(s.volume * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} value={Math.round(s.volume * 100)}
              onChange={(e) => updateSoundSettings({ volume: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--accent)]" dir="ltr" />
          </div>

          <button type="button" onClick={() => playSound("notification", { force: true })}
            className="mb-2 w-full rounded-xl border border-accent/30 bg-accent/10 py-2 text-xs text-accent hover:bg-accent/20">
            🔊 تجربة الصوت
          </button>

          <div className="border-t border-white/10 pt-2">
            {CATS.map((c) => (
              <label key={c.key} className="flex items-center justify-between py-1 text-xs text-white/80">
                <span>{c.label}</span>
                <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.categories[c.key]}
                  onChange={(e) => updateSoundSettings({ categories: { ...s.categories, [c.key]: e.target.checked } })} />
              </label>
            ))}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2">
            <label className="flex items-center justify-between py-1 text-xs">
              <span className="flex items-center gap-1"><Moon className="size-3.5" /> ساعات الهدوء</span>
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.quietEnabled}
                onChange={(e) => updateSoundSettings({ quietEnabled: e.target.checked })} />
            </label>
            <div className="mt-1 flex items-center gap-2 text-xs" dir="ltr">
              <input type="time" value={s.quietStart} onChange={(e) => updateSoundSettings({ quietStart: e.target.value })}
                className="flex-1 rounded-xl bg-white/10 px-2 py-1 text-white" />
              <span className="text-white/50">–</span>
              <input type="time" value={s.quietEnd} onChange={(e) => updateSoundSettings({ quietEnd: e.target.value })}
                className="flex-1 rounded-xl bg-white/10 px-2 py-1 text-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
