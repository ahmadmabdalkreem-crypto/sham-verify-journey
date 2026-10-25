export type RequestStatus = "under_review" | "needs_info" | "verified" | "rejected";

export const statusMeta: Record<
  RequestStatus,
  { label: string; badge: string; dot: string }
> = {
  under_review: {
    label: "قيد المراجعة",
    badge: "bg-info/10 text-info border-info/20",
    dot: "bg-info",
  },
  needs_info: {
    label: "يحتاج معلومات",
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    dot: "bg-warning",
  },
  verified: {
    label: "موثق",
    badge: "bg-success/12 text-success border-success/25",
    dot: "bg-success",
  },
  rejected: {
    label: "مرفوض",
    badge: "bg-destructive/12 text-destructive border-destructive/25",
    dot: "bg-destructive",
  },
};

export type VerificationRequest = {
  id: string;
  name: string;
  email: string;
  status: RequestStatus;
  submittedAt: string;
  note?: string;
};

export const requests: VerificationRequest[] = [
  {
    id: "SC-104287",
    name: "أحمد محمد عبد الكريم",
    email: "ahmad@example.com",
    status: "under_review",
    submittedAt: "2026-08-28",
  },
  {
    id: "SC-104286",
    name: "ليان خالد الحسن",
    email: "layan@example.com",
    status: "verified",
    submittedAt: "2026-08-27",
  },
  {
    id: "SC-104285",
    name: "عمر سامي الديري",
    email: "omar@example.com",
    status: "needs_info",
    submittedAt: "2026-08-27",
    note: "صورة إثبات السكن غير واضحة، يرجى إعادة الرفع.",
  },
  {
    id: "SC-104284",
    name: "رهف ياسر النعيمي",
    email: "rahaf@example.com",
    status: "verified",
    submittedAt: "2026-08-26",
  },
  {
    id: "SC-104283",
    name: "سامر وليد القاسم",
    email: "samer@example.com",
    status: "under_review",
    submittedAt: "2026-08-26",
  },
  {
    id: "SC-104282",
    name: "نور الهدى صالح",
    email: "noor@example.com",
    status: "verified",
    submittedAt: "2026-08-25",
  },
  {
    id: "SC-104281",
    name: "زيد فادي المصري",
    email: "zaid@example.com",
    status: "needs_info",
    submittedAt: "2026-08-25",
    note: "يرجى إرفاق صورة أوضح للهوية الشخصية.",
  },
];

export const countryCodes = [
  { code: "+963", label: "سوريا" },
  { code: "+962", label: "الأردن" },
  { code: "+971", label: "الإمارات" },
  { code: "+966", label: "السعودية" },
  { code: "+90", label: "تركيا" },
  { code: "+49", label: "ألمانيا" },
];
