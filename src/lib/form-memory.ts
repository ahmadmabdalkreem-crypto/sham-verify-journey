import { useEffect, useState } from "react";

/** قراءة قيمة محفوظة من التخزين المحلي بأمان */
export function readStored(key: string): string | null {
  try {
    const v = window.localStorage.getItem(key);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  try {
    if (value && value.trim()) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * حالة نصية محفوظة تلقائياً: إذا عاد العميل للرابط يجد ما أدخله سابقاً.
 */
export function usePersistedField(key: string, fallback = "") {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const saved = readStored(key);
    if (saved) setValue(saved);
  }, [key]);

  useEffect(() => {
    // لا نكتب القيمة الافتراضية فوق بيانات محفوظة (يحدث عند إعادة تركيب الصفحة)
    if (value.trim() === fallback.trim() && readStored(key)) return;
    writeStored(key, value);
  }, [key, value, fallback]);

  return [value, setValue] as const;
}

/**
 * كائن محفوظ تلقائياً (JSON) — يُدمج مع القيم الافتراضية.
 */
export function usePersistedObject<T extends Record<string, string>>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<T>;
      if (parsed && typeof parsed === "object") {
        setValue((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
