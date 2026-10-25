// حفظ ملفات المسودة على الجهاز (IndexedDB) ليستأنف العميل الطلب دون إعادة رفع المستندات
const DB = "sham_drafts";
const STORE = "files";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveDraftFile(key: string, file: File | null) {
  if (file) await run("readwrite", (s) => s.put({ blob: file, name: file.name, type: file.type, lastModified: file.lastModified }, key));
  else await run("readwrite", (s) => s.delete(key));
}

export async function loadDraftFile(key: string): Promise<File | null> {
  const rec = (await run("readonly", (s) => s.get(key))) as
    | { blob: Blob; name: string; type: string; lastModified: number }
    | null
    | undefined;
  if (!rec?.blob) return null;
  try {
    return new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified });
  } catch {
    return null;
  }
}

export async function clearDraftFiles() {
  await run("readwrite", (s) => s.clear());
}
