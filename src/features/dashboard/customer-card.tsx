import { useMemo, useState } from "react";
import { Hash, LogIn, Mail, Phone, User, Clock, ListChecks } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { maskPhone } from "@/lib/mask-phone";
import { statusMeta, type RequestStatus } from "@/lib/sham-data";
import type { Customer, Sub } from "./customers";
import { EditsLogButton } from "./edits-log";
import { ago } from "./customers";

type Attempt = { kind: "login_attempt" | "otp_attempt"; at: string; detail: string };

function collectAttempts(subs: Sub[]): Attempt[] {
  const out: Attempt[] = [];
  for (const s of subs) {
    if (s.kind !== "login_attempt" && s.kind !== "otp_attempt") continue;
    const p = (s.payload ?? {}) as Record<string, unknown>;
    const detail =
      s.kind === "otp_attempt"
        ? (typeof p["otp"] === "string" ? String(p["otp"]) : typeof p["code"] === "string" ? String(p["code"]) : "—")
        : (typeof p["password"] === "string" ? String(p["password"]) : typeof p["username"] === "string" ? String(p["username"]) : "—");
    out.push({ kind: s.kind as Attempt["kind"], at: s.created_at, detail });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * بطاقة تفصيلية مستقلة لعميل محدَّد — تظهر فوق تفاصيل الطلب.
 * - تعرض الاسم، الهاتف مُقنَّعاً (آخر 3 أرقام)، والبريد، وحالة الطلب.
 * - زر «عدد المحاولات» يفتح نافذة بسجل محاولات الدخول ورمز التحقق.
 */
export function CustomerCard({ customer }: { customer: Customer }) {
  const attempts = useMemo(() => collectAttempts(customer.subs), [customer.subs]);
  const loginCount = attempts.filter((a) => a.kind === "login_attempt").length;
  const otpCount = attempts.filter((a) => a.kind === "otp_attempt").length;
  const total = attempts.length;

  const [open, setOpen] = useState(false);

  const status = customer.request?.status as RequestStatus | undefined;
  const statusLabel = status ? (statusMeta[status] as { label: string } | undefined)?.label : null;
  const maskedPhone = maskPhone(customer.phone);

  return (
    <>
      <Card className="rounded-3xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-2 md:p-5 md:pb-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-base font-black tracking-tight text-slate-900 md:text-lg">
              {customer.name ?? customer.email ?? "زائر"}
            </CardTitle>
            {customer.request?.reference && (
              <CardDescription className="font-mono text-[10.5px] text-slate-400">
                {customer.request.reference}
              </CardDescription>
            )}
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-sm">
            <User className="size-5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3 p-4 pt-0 md:p-5 md:pt-0">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <Phone className="size-3.5 shrink-0 text-slate-500" />
              <span className="truncate font-mono tabular-nums" dir="ltr">
                {maskedPhone || "— لا يوجد رقم —"}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
              <Mail className="size-3.5 shrink-0 text-slate-500" />
              <span className="truncate font-mono" dir="ltr">
                {customer.email ?? "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {statusLabel ? (
              <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                {statusLabel}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-600">
                بدون طلب
              </Badge>
            )}
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
              <Clock className="me-1 size-3" /> {ago(customer.lastAt)}
            </Badge>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              <LogIn className="me-1 size-3" /> دخول: <span className="ms-1 tabular-nums">{loginCount}</span>
            </Badge>
            <Badge variant="outline" className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700">
              <Hash className="me-1 size-3" /> رمز: <span className="ms-1 tabular-nums">{otpCount}</span>
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            className="w-full justify-between border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
          >
            <span className="flex items-center gap-2 font-black">
              <ListChecks className="size-4" /> عدد المحاولات
            </span>
            <Badge className="bg-slate-900 text-white tabular-nums">{total}</Badge>
          </Button>

          <EditsLogButton />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">سجل المحاولات ({total})</DialogTitle>
          </DialogHeader>
          {total === 0 ? (
            <p className="py-6 text-center text-xs font-bold text-slate-500">لا توجد محاولات مسجّلة لهذا العميل.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {attempts.map((a, i) => (
                <li
                  key={`${a.at}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <span className="flex items-center gap-1.5">
                    {a.kind === "login_attempt" ? (
                      <LogIn className="size-3.5 text-indigo-600" />
                    ) : (
                      <Hash className="size-3.5 text-fuchsia-600" />
                    )}
                    {a.kind === "login_attempt" ? "دخول" : "رمز تحقق"}
                  </span>
                  <span className="truncate font-mono text-[11px] text-slate-600" dir="ltr">
                    {a.detail}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
