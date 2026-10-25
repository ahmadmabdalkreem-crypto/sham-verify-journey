import type { Customer } from "./customers";
import { pageLabels } from "@/lib/presence";
import { statusMeta, type RequestStatus } from "@/lib/sham-data";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCustomersCsv(customers: Customer[]) {
  const header = ["الاسم", "البريد", "الهاتف", "الحالة", "آخر صفحة", "آخر نشاط", "عدد الإدخالات", "المرجع"];
  const rows = customers.map((c) => {
    const st = c.request ? (statusMeta[c.request.status as RequestStatus] as { label?: string } | undefined)?.label ?? c.request.status : "بدون طلب";
    const page = c.page ? pageLabels[c.page] ?? c.page : "";
    return [c.name ?? "", c.email ?? "", c.phone ?? "", st, page, new Date(c.lastAt).toLocaleString("ar"), c.count, c.request?.reference ?? ""].map(esc).join(",");
  });
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
