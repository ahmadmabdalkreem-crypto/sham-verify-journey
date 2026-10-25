/**
 * اهتزاز لمسي بسيط (Haptics) — يعمل فقط على الأجهزة التي تدعم navigator.vibrate.
 * يمكن تعطيله من الإعدادات؛ الحالة محفوظة في localStorage.
 */

const STORAGE_KEY = "sham_haptics";

export const TAP_PATTERN = 18;
export const SUCCESS_PATTERN = [10, 30, 10];
export const ERROR_PATTERN = [50];

export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function buzz(pattern: number | number[]) {
  if (!hapticsSupported() || !hapticsEnabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export const hapticTap = () => buzz(TAP_PATTERN);
export const hapticSuccess = () => buzz(SUCCESS_PATTERN);
export const hapticError = () => buzz(ERROR_PATTERN);

/** يربط اهتزازاً خفيفاً بكل ضغطة زر في الصفحة. يعيد دالة إلغاء. */
export function installTapHaptics(): () => void {
  if (typeof document === "undefined" || !hapticsSupported()) return () => {};
  const onPointerUp = (e: Event) => {
    const target = e.target as HTMLElement | null;
    const el = target?.closest?.(
      'button, [role="button"], a[href], input[type="submit"], input[type="button"], summary, .h-card-hover, .h-card, [data-haptic]',
    ) as HTMLElement | null;
    if (!el) return;
    if ((e as PointerEvent).pointerType === "mouse") return;
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
    if (el.dataset["haptic"] === "off") return;
    hapticTap();
  };
  document.addEventListener("pointerup", onPointerUp, { passive: true });
  // اهتزاز خطأ موحّد عند ظهور حقل خاطئ (يعتمد على حركة الهزّة في CSS)
  const onAnim = (e: AnimationEvent) => { if (e.animationName === "fieldShake") hapticError(); };
  document.addEventListener("animationstart", onAnim);
  return () => {
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("animationstart", onAnim);
  };
}
