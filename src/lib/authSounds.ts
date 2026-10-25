/** ثلاثة أصوات فقط: الدخول، الرمز، الخروج من الأجهزة — مولّدة بـ Web Audio. */
const MUTE_KEY = "sham_dash_sound"; // "0" = مكتوم
const VOL_KEY = "sham_auth_volume";

let ctx: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
let unlocked = false;
const last: Record<string, number> = {};

export function getAuthVolume(): number {
  try { const v = Number(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) && localStorage.getItem(VOL_KEY) !== null ? v : 0.5; } catch { return 0.5; }
}
export function setAuthVolume(v: number) {
  try { localStorage.setItem(VOL_KEY, String(Math.min(1, Math.max(0, v)))); } catch { /* ignore */ }
}
function muted() {
  try { return localStorage.getItem(MUTE_KEY) === "0"; } catch { return false; }
}

function getCtx(): AudioContext | null {
  if (!unlocked) return null;
  if (!ctx) {
    const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const C = W.AudioContext ?? W.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = buf;
    const wet = ctx.createGain();
    wet.gain.value = 0.2;
    reverb.connect(wet).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** يُستدعى عند التحميل: يجهّز الصوت بعد أول تفاعل فقط (iOS Safari). */
export function installAuthSoundUnlock(): () => void {
  const unlock = () => {
    unlocked = true;
    const c = getCtx();
    if (c) { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); }
    off();
  };
  const evs = ["pointerdown", "keydown", "touchend"];
  const off = () => evs.forEach((e) => document.removeEventListener(e, unlock, true));
  evs.forEach((e) => document.addEventListener(e, unlock, { capture: true, passive: true }));
  return off;
}

function tone(c: AudioContext, f: number, t: number, d: number, peak: number, wet: boolean) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  g.connect(c.destination);
  if (wet && reverb) g.connect(reverb);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = f;
  o.connect(g);
  o.start(t);
  o.stop(t + d + 0.05);
}

function play(id: string, fn: (c: AudioContext, t: number, v: number) => void, vib: number | number[], force = false) {
  if (!force && muted()) return;
  const now = Date.now();
  if (!force && now - (last[id] ?? 0) < 1000) return;
  const c = getCtx();
  if (!c) return;
  last[id] = now;
  fn(c, c.currentTime + 0.01, getAuthVolume() * 2);
  try { navigator.vibrate?.(vib); } catch { /* ignore */ }
}

export const playLoginSound = (force = false) =>
  play("login", (c, t, v) => {
    tone(c, 523.25, t, 0.3, 0.35 * v * 0.5, true);
    tone(c, 659.25, t + 0.13, 0.3, 0.35 * v * 0.5, true);
    tone(c, 783.99, t + 0.26, 0.34, 0.35 * v * 0.5, true);
  }, 10, force);

export const playOtpSound = (force = false) =>
  play("otp", (c, t, v) => tone(c, 880, t, 0.4, 0.3 * v * 0.5, true), [10, 50, 10], force);

export const playLogoutDevicesSound = (force = false) =>
  play("logout", (c, t, v) => {
    tone(c, 659.25, t, 0.26, 0.3 * v * 0.5, true);
    tone(c, 523.25, t + 0.2, 0.3, 0.3 * v * 0.5, true);
  }, 20, force);
