import { useState } from "react";
import { Check, ChevronDown, Copy, History, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type EditEntry = {
  id: string;
  at: string;
  field: string;
  before: string;
  after: string;
};

/** بيانات عيّنة عامة — للعرض فقط. */
export const sampleEdits: EditEntry[] = [
  { id: "e1", at: "2026-10-11 12:40", field: "الحقل الأول", before: "القيمة أ", after: "القيمة ب" },
  { id: "e2", at: "2026-10-11 11:05", field: "الحقل الثاني", before: "123456", after: "654321" },
  { id: "e3", at: "2026-10-10 18:22", field: "الحقل الثالث", before: "غير محدّد", after: "محدّد" },
  { id: "e4", at: "2026-10-09 09:14", field: "الحقل الرابع", before: "قيمة قديمة", after: "قيمة جديدة" },
];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label="نسخ التعديل"
      className="size-8 shrink-0 text-slate-500 hover:text-slate-900"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* تجاهل */
        }
      }}
    >
      {done ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
    </Button>
  );
}

/**
 * سجل التعديلات — مخفي حتى يُضغط الزر، ثم ينفتح داخل البطاقة من الأسفل.
 * عرض فقط: يُظهر الحقول المتغيّرة (القيمة السابقة ← الجديدة) والوقت وزر نسخ.
 */
export function EditsLogButton({
  entries = sampleEdits,
  loading = false,
}: {
  entries?: EditEntry[];
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="w-full">
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
      >
        <span className="flex items-center gap-2 font-black">
          <History className="size-4" /> سجل التعديلات
          <Badge className="bg-slate-900 text-white tabular-nums">{entries.length}</Badge>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open ? (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2">
            {loading ? (
              <ul className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </ul>
            ) : entries.length === 0 ? (
              <div className="grid place-items-center gap-2 py-16 text-center">
                <Inbox className="size-8 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">لا توجد تعديلات مسجّلة.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-black text-slate-900">{e.field}</span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400 tabular-nums" dir="ltr">
                          {e.at}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500 line-through">
                          {e.before}
                        </span>
                        <span className="text-slate-400">←</span>
                        <span className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-teal-700">
                          {e.after}
                        </span>
                      </div>
                    </div>
                    <CopyButton text={`${e.field}: ${e.before} ← ${e.after} (${e.at})`} />
                  </li>
                ))}
              </ul>
            )}
        </div>
      ) : null}
    </div>
  );
}
