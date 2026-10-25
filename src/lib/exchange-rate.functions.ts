import { createServerFn } from "@tanstack/react-start";

/** سعر الاحتياط إذا تعذّر الوصول للمصدر (ليرة سورية جديدة لكل دولار). */
export const FALLBACK_RATE = 141;
const SOURCE_URL = "https://sp-today.com/currency/us-dollar";
const TTL_MS = 6 * 60 * 60 * 1000; // يُعاد الجلب كل 6 ساعات كحد أقصى

export type ExchangeRate = { rate: number; updatedAt: string; source: string; live: boolean };

let cache: { value: ExchangeRate; at: number } | null = null;

export const getUsdRate = createServerFn({ method: "GET" }).handler(async (): Promise<ExchangeRate> => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const html = await res.text();
    const m = html.match(/هو\s*([\d.]+)\s*ليرة جديدة[\s\S]{0,80}?و\s*([\d.]+)\s*ليرة جديدة/);
    const sell = m ? Number(m[2]) : NaN;
    if (!Number.isFinite(sell) || sell < 20 || sell > 2000) throw new Error("parse");
    const value: ExchangeRate = { rate: sell, updatedAt: new Date().toISOString(), source: "الليرة اليوم", live: true };
    cache = { value, at: Date.now() };
    return value;
  } catch (e) {
    console.error("exchange rate fetch failed", e);
    if (cache) return cache.value;
    return { rate: FALLBACK_RATE, updatedAt: "2026-10-12T00:00:00.000Z", source: "سعر احتياطي", live: false };
  }
});
