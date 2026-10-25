/**
 * طبقة أصوات فاخرة مولَّدة برمجياً (Web Audio API) — بدون ملفات خارجية.
 * لا يُنشأ AudioContext إلا بعد أول تفاعل من المستخدم.
 */
import { useSyncExternalStore } from "react";

export type SoundType = "success" | "notification" | "alert" | "error";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0..1
  categories: Record<SoundType, boolean>;
  quietEnabled: boolean;
  quietStart: string; // "22:00"
  quietEnd: string; // "08:00"
}

const KEY = "sham_sound_settings";
const DEFAULTS: SoundSettings = {
  enabled: true,
  volume: 0.5,
  categories: { success: true, notification: true, alert: true, error: true },
  quietEnabled: true,
  quietStart: "22:00",
  quietEnd: "08:00",
};

let settings: SoundSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SoundSettings>;
      settings = { ...DEFAULTS, ...p, categories: { ...DEFAULTS.categories, ...(p.categories ?? {}) } };
    }
  } catch { /* ignore */ }
}

function save() {
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function getSoundSettings(): SoundSettings {
  load();
  return settings;
}
export function updateSoundSettings(patch: Partial<SoundSettings>) {
  load();
  settings = { ...settings, ...patch };
  save();
}
export const setSoundEnabled = (enabled: boolean) => updateSoundSettings({ enabled });
export const setSoundVolume = (v: number) => updateSoundSettings({ volume: Math.min(1, Math.max(0, v)) });
export const isSoundEnabled = () => getSoundSettings().enabled;

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    getSoundSettings,
    () => DEFAULTS,
  );
}

// ---------- Audio engine ----------
let ctx: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
let master: GainNode | null = null;
let unlocked = false;

function makeImpulse(c: AudioContext, seconds = 1.4, decay = 3) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensureCtx(): AudioContext | null {
  if (!unlocked || typeof window === "undefined") return null;
  if (!ctx) {
    const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    reverb.connect(wet).connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** يفعّل الصوت بعد أول تفاعل (متوافق مع سياسة iOS Safari). */
export function installSoundUnlock(): () => void {
  if (typeof document === "undefined") return () => {};
  const unlock = () => {
    unlocked = true;
    const c = ensureCtx();
    if (c) {
      // نغمة صامتة لفك قفل iOS
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    }
    remove();
  };
  const evs = ["pointerdown", "keydown", "touchend"] as const;
  const remove = () => evs.forEach((e) => document.removeEventListener(e, unlock, true));
  evs.forEach((e) => document.addEventListener(e, unlock, { capture: true, passive: true }));
  return remove;
}

/**
 * نغمة جرس دافئة: هجوم ناعم بلا نقرة، فلتر يزيل الحدّة،
 * وهارمونيكات خافتة تخفت أسرع من الأساس (سلوك الجرس الحقيقي).
 */
function tone(c: AudioContext, freq: number, start: number, dur: number, peak: number, type: OscillatorType = "sine") {
  // فلتر تمرير منخفض يفتح ثم ينغلق: يمنع الطابع الرقمي الحاد
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(Math.min(freq * 2.2, 2000), start);
  lp.frequency.linearRampToValueAtTime(Math.min(freq * 5, 6000), start + 0.05);
  lp.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.4, 220), start + dur);

  const out = c.createGain();
  // هجوم 35ms بمنحنى خطّي ناعم، ثم تلاشٍ طويل
  out.gain.setValueAtTime(0, start);
  out.gain.linearRampToValueAtTime(peak, start + 0.035);
  out.gain.setTargetAtTime(0.0001, start + 0.035, dur / 3.2);
  lp.connect(out);
  out.connect(master!);
  out.connect(reverb!);

  const o1 = c.createOscillator();
  o1.type = type;
  o1.frequency.setValueAtTime(freq, start);
  o1.connect(lp);

  // أوكتاف + خامسة خافتان يخفتان أسرع، لطابع جرس طبيعي
  const partial = (mult: number, level: number, detune: number) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak * level, start + 0.03);
    g.gain.setTargetAtTime(0.0001, start + 0.03, dur / 7);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * mult, start);
    o.detune.setValueAtTime(detune, start);
    o.connect(g).connect(lp);
    o.start(start);
    o.stop(start + dur + 0.4);
  };
  partial(2, 0.1, 4);
  partial(3, 0.045, -5);

  o1.start(start);
  o1.stop(start + dur + 0.4);
}

const HZ = {
  F3: 174.61, A3: 220, D4: 293.66, F4: 349.23, A4: 440,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

function inQuietHours(s: SoundSettings) {
  if (!s.quietEnabled) return false;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const d = new Date();
  const now = d.getHours() * 60 + d.getMinutes();
  const a = toMin(s.quietStart), b = toMin(s.quietEnd);
  return a <= b ? now >= a && now < b : now >= a || now < b;
}

const lastPlayed: Partial<Record<SoundType, number>> = {};
const VIBES: Record<SoundType, number | number[]> = {
  success: [12, 40, 12, 40, 20], error: [60, 40, 60], notification: [15, 25, 15], alert: [20, 50, 20, 50, 20],
};

export function playSound(type: SoundType, opts: { force?: boolean } = {}) {
  const s = getSoundSettings();
  if (!s.enabled && !opts.force) return;
  if (!s.categories[type] && !opts.force) return;
  if (!opts.force && inQuietHours(s) && type !== "error") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !opts.force) return;
  const nowMs = Date.now();
  if (!opts.force && nowMs - (lastPlayed[type] ?? 0) < 1000) return;
  const c = ensureCtx();
  if (!c || !master) return;
  lastPlayed[type] = nowMs;

  const peak = 0.32 * s.volume;
  if (peak <= 0.0005) return;
  const t = c.currentTime + 0.01;
  switch (type) {
    case "success": {
      // أربوجيو صاعد مرح + قفلة أوكتاف عالية (C-E-G-C-G6)
      tone(c, HZ.C5, t,        0.28, peak * 0.9);
      tone(c, HZ.E5, t + 0.08, 0.28, peak * 0.9);
      tone(c, HZ.G5, t + 0.16, 0.28, peak * 0.95);
      tone(c, HZ.C6, t + 0.24, 0.55, peak * 1.0);
      tone(c, HZ.G6, t + 0.32, 0.9,  peak * 0.75);
      tone(c, HZ.E6, t + 0.32, 0.9,  peak * 0.55); // تناغم
      break;
    }
    case "notification": {
      // جرس كريستالي فخم: ضربة مزدوجة صاعدة + ذيل متناغم طويل
      tone(c, HZ.G5, t,        0.20, peak * 0.75);
      tone(c, HZ.D6, t,        0.26, peak * 0.95);
      tone(c, HZ.G6, t + 0.02, 0.38, peak * 0.55);
      tone(c, HZ.B5, t + 0.14, 0.22, peak * 0.7);
      tone(c, HZ.E6, t + 0.14, 0.32, peak * 0.9);
      tone(c, HZ.G6, t + 0.16, 0.55, peak * 0.6);
      tone(c, HZ.D6, t + 0.30, 0.9,  peak * 0.5); // ذيل متناغم
      tone(c, HZ.G5, t + 0.30, 1.0,  peak * 0.35);
      break;
    }
    case "alert": {
      // لحن نابض ثلاثي الصعود/الهبوط يلفت الانتباه (A-C-E-C-A)
      tone(c, HZ.A5, t,        0.22, peak * 0.9);
      tone(c, HZ.C6, t + 0.11, 0.22, peak * 0.9);
      tone(c, HZ.E6, t + 0.22, 0.28, peak * 0.95);
      tone(c, HZ.C6, t + 0.36, 0.22, peak * 0.9);
      tone(c, HZ.A5, t + 0.47, 0.5,  peak * 0.85);
      break;
    }
    case "error": {
      // هبوط دافئ ثلاثي بطابع عميق (F-D-A)
      tone(c, HZ.F4, t,        0.3,  peak * 0.95, "triangle");
      tone(c, HZ.D4, t + 0.14, 0.35, peak * 0.95, "triangle");
      tone(c, HZ.A3, t + 0.3,  0.75, peak * 1.0,  "triangle");
      tone(c, HZ.F3, t + 0.3,  0.75, peak * 0.5,  "sine"); // تدعيم باس
      break;
    }
  }
  try { navigator.vibrate?.(VIBES[type]); } catch { /* ignore */ }
}

/** يربط أصوات بتوستات sonner الموجودة (success/error/aW5mbw). */
export async function installToastSounds() {
  const mod = await import("sonner");
  const t = mod.toast as unknown as Record<string, (...a: unknown[]) => unknown> & { __sham?: boolean };
  if (t.__sham) return;
  t.__sham = true;
  const wrap = (k: string, type: SoundType) => {
    const orig = t[k];
    if (typeof orig !== "function") return;
    t[k] = (...a: unknown[]) => { playSound(type); return orig(...a); };
  };
  wrap("success", "success");
  wrap("error", "error");
  wrap("info", "notification");
  wrap("warning", "alert");
}

/** صوت حسب الصفحة (تحديثات حالة الطلب للعميل). */
export function soundForPath(path: string): SoundType | null {
  if (path.startsWith("/c3VjY2Vzcw")) return "success";
  if (path.startsWith("/YmxvY2tlZA")) return "error";
  if (/^\/(attempts|verify|complete|logout-devices)/.test(path)) return "alert";
  if (/^\/(pending|review|otp)/.test(path)) return "notification";
  return null;
}
