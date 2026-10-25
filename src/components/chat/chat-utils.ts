export type PendingFile = { name: string; type: string; size: number; base64: string };

export const MAX_FILE = 10 * 1024 * 1024;

export async function fileToPending(file: File): Promise<PendingFile> {
  if (file.size > MAX_FILE) throw new Error("حجم الملف يتجاوز 10 ميغابايت");
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  return { name: file.name, type: file.type, size: file.size, base64: btoa(bin) };
}

let ctx: AudioContext | null = null;
export function chatBeep() {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.32);
  } catch {
    /* ignore */
  }
}

export function soundPref(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}
export function setSoundPref(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ar", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

export function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** تصدير المحادثة PDF عبر نافذة الطباعة (حفظ كـ PDF). */
export function exportChatPdf(
  title: string,
  messages: Array<{ sender_role: string; content: string; created_at: string; attachments: { name: string }[] }>,
) {
  const w = window.open("", "_blank");
  if (!w) return;
  const rows = messages
    .map((m) => {
      const who = m.sender_role === "supervisor" ? "المشرف" : m.sender_role === "client" ? "العميل" : "النظام";
      const files = m.attachments?.length ? `<div class="f">📎 ${m.attachments.map((a) => esc(a.name)).join("، ")}</div>` : "";
      return `<div class="m ${m.sender_role}"><div class="h"><b>${who}</b><span>${esc(fmtTime(m.created_at))}</span></div><div>${esc(m.content).replace(/\n/g, "<br>")}</div>${files}</div>`;
    })
    .join("");
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}h1{font-size:18px}.m{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin:8px 0;page-break-inside:avoid}.supervisor{background:#eff6ff}.system{background:#f8fafc;color:#64748b;font-size:12px}.h{display:flex;justify-content:space-between;font-size:12px;color:#475569;margin-bottom:4px}.f{font-size:12px;color:#475569;margin-top:4px}</style></head>
<body><h1>${esc(title)}</h1><p style="font-size:12px;color:#64748b">تاريخ التصدير: ${esc(new Date().toLocaleString("ar"))}</p>${rows}<script>onload=()=>setTimeout(()=>print(),200)</script></body></html>`);
  w.document.close();
}
