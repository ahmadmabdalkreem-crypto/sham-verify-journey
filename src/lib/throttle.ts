// منع تكرار الطلبات بسرعة: يُرجع true إذا تكرر نفس المفتاح خلال windowMs
const lastAt = new Map<string, number>();

export function isRapidRepeat(key: string, windowMs = 1500): boolean {
  const now = Date.now();
  const prev = lastAt.get(key) ?? 0;
  if (now - prev < windowMs) return true;
  lastAt.set(key, now);
  return false;
}

export function remainingCooldown(key: string, windowMs = 1500): number {
  const prev = lastAt.get(key) ?? 0;
  return Math.max(0, windowMs - (Date.now() - prev));
}
