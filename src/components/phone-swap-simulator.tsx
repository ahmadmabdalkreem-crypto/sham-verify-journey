import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Check, Signal, Wifi, BatteryFull } from "lucide-react";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { getUsdRate, FALLBACK_RATE, type ExchangeRate } from "@/lib/exchange-rate.functions";


type Code = "SYP" | "USD";

const META: Record<Code, { label: string; flag: string; symbol: string }> = {
  SYP: { label: "ليرة سورية جديدة", flag: "🇸🇾", symbol: "ل.س" },
  USD: { label: "دولار أمريكي", flag: "🇺🇸", symbol: "$" },
};

function convert(amount: number, from: Code, to: Code, rate: number) {
  if (from === to) return amount;
  return from === "SYP" ? amount / rate : amount * rate;
}

function format(value: number, code: Code) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** عدّاد ناعم يتحرك نحو القيمة الهدف */
function useSmoothNumber(target: number) {
  const [value, setValue] = useState(target);
  const raf = useRef<number | null>(null);
  const fromRef = useRef(target);
  const startRef = useRef(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = performance.now();
    const from = fromRef.current;
    const delta = target - from;
    if (Math.abs(delta) < 0.001) {
      setValue(target);
      return;
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / 420);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + delta * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export function PhoneSwapSimulator() {
  const [from, setFrom] = useState<Code>("SYP");
  const [to, setTo] = useState<Code>("USD");
  const [raw, setRaw] = useState("5000");
  const [spin, setSpin] = useState(0);
  const [done, setDone] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);

  const [fx, setFx] = useState<ExchangeRate | null>(null);
  useEffect(() => {
    let alive = true;
    getUsdRate().then((r) => alive && setFx(r)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const rate = fx?.rate ?? FALLBACK_RATE;
  const updatedLabel = fx
    ? new Intl.DateTimeFormat("ar-SY", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(fx.updatedAt))
    : "…";

  const amount = useMemo(() => Number(raw.replace(/[^\d.]/g, "")) || 0, [raw]);
  const converted = useSmoothNumber(convert(amount, from, to, rate));

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2600);
    return () => clearTimeout(t);
  }, [done]);

  const swap = () => {
    hapticTap();
    setSpin((s) => s + 180);
    setFrom(to);
    setTo(from);
    const next = convert(amount, from, to, rate);
    setRaw(to === "USD" ? (Math.round(next * 100) / 100).toFixed(2) : String(Math.round(next)));
  };

  const confirm = () => {
    hapticSuccess();
    setDone(true);
    setTimeout(() => {
      window.location.assign("/YXV0aA");
    }, 1200);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTiltY(px * 10);
    setTiltX(-py * 10);
  };
  const resetTilt = () => {
    setTiltX(0);
    setTiltY(0);
  };

  return (
    <div
      className="phone-sim relative mx-auto w-full max-w-[min(340px,calc(100vw-2rem))] select-none"
      style={{ perspective: "1400px" }}
      onPointerMove={onMove}
      onPointerLeave={resetTilt}
    >
      {/* هالة ذهبية خلفية */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.35),transparent_65%)] blur-2xl" />
      {/* ظل أرضي طبيعي */}
      <div className="pointer-events-none absolute inset-x-10 -bottom-8 h-12 rounded-[50%] bg-black/60 blur-2xl" />

      {/* إطار الهاتف الذهبي الخارجي */}
      <div
        className="relative rounded-[2.9rem] p-[2px] transition-transform duration-200 ease-out will-change-transform"
        style={{
          background:
            "linear-gradient(135deg,#f6e08a 0%,#b8902e 18%,#f8e58c 36%,#8c6a1f 55%,#f3d777 75%,#9c7623 100%)",
          boxShadow:
            "0 40px 70px -20px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,235,170,0.4)",
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* إطار داخلي أسود رفيع */}
        <div className="relative rounded-[2.85rem] bg-black p-[6px]">
          {/* أزرار جانبية ذهبية */}
          <div className="absolute -right-[3px] top-24 h-10 w-[3px] rounded-r bg-gradient-to-b from-[#d8ad46] to-[#8a6a21]" />
          <div className="absolute -left-[3px] top-24 h-7 w-[3px] rounded-l bg-gradient-to-b from-[#d8ad46] to-[#8a6a21]" />
          <div className="absolute -left-[3px] top-36 h-12 w-[3px] rounded-l bg-gradient-to-b from-[#d8ad46] to-[#8a6a21]" />
          <div className="absolute -left-[3px] top-52 h-12 w-[3px] rounded-l bg-gradient-to-b from-[#d8ad46] to-[#8a6a21]" />

          {/* الشاشة */}
          <div
            className="relative overflow-hidden rounded-[2.45rem] ring-1 ring-white/5"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, #1a2a52 0%, #0d1836 55%, #060c20 100%)",
            }}
          >
            {/* بريق شاشة */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent" />

            {/* شريط الحالة */}
            <div className="relative flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold text-white/95">
              <span>٩:٤١</span>
              {/* الجزيرة الديناميكية */}
              <div className="absolute left-1/2 top-2.5 h-7 w-28 -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                <div className="absolute right-2 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#111] ring-1 ring-white/10" />
              </div>
              <span className="flex items-center gap-1 text-white/90">
                <Signal className="size-3.5" />
                <Wifi className="size-3.5" />
                <BatteryFull className="size-4" />
              </span>
            </div>

            {/* شاشة التطبيق */}
            <div dir="rtl" className="relative px-3.5 pt-3 pb-5 text-right sm:px-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="sim-title bg-gradient-to-b from-[#f8e58c] to-[#b8902e] bg-clip-text text-sm font-bold text-transparent">
                  تبديل العملة
                </h3>
                <span className="sim-pill rounded-full border border-[#d8ad46]/40 bg-[#d8ad46]/10 px-2 py-0.5 text-[11px] font-medium text-[#f3d777]">
                  سعر لحظي
                </span>
              </div>

              {/* من */}
              <Field
                title="من"
                code={from}
                value={raw}
                onValue={setRaw}
                onCode={(c) => {
                  hapticTap();
                  setFrom(c);
                  if (c === to) setTo(c === "SYP" ? "USD" : "SYP");
                }}
              />

              {/* زر التبديل الذهبي */}
              <div className="relative my-2 flex justify-center">
                <div className="absolute inset-x-2 top-1/2 h-px bg-[#d8ad46]/20" />
                <button
                  type="button"
                  onClick={swap}
                  aria-label="تبديل الاتجاه"
                  className="sim-swap relative z-10 flex size-12 touch-manipulation items-center justify-center rounded-full text-[#2a1f06] transition-transform duration-300 active:scale-90"
                  style={{
                    background:
                      "linear-gradient(135deg,#fff1b4 0%,#d8ad46 45%,#8a6a21 100%)",
                    boxShadow:
                      "0 8px 18px -4px rgba(184,144,46,0.55), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.35)",
                    transform: `rotate(${spin}deg)`,
                  }}
                >
                  <ArrowDownUp className="size-4" />
                </button>
              </div>

              {/* إلى */}
              <Field
                title="إلى"
                code={to}
                value={format(converted, to)}
                readOnly
                onCode={(c) => {
                  hapticTap();
                  setTo(c);
                  if (c === from) setFrom(c === "SYP" ? "USD" : "SYP");
                }}
              />

              <p className="sim-muted mt-2 text-xs text-white/55">
                1 {META.USD.symbol} = {format(rate, "SYP")} {META.SYP.symbol} جديدة
              </p>
              <p className="sim-muted mt-0.5 text-[11px] text-white/50">
                آخر تحديث: {updatedLabel}{fx && !fx.live ? " (سعر احتياطي)" : ""}
              </p>

              <button
                type="button"
                onClick={confirm}
                onPointerDown={() => setPressing(true)}
                onPointerUp={() => setPressing(false)}
                onPointerLeave={() => setPressing(false)}
                className={`sim-cta relative mt-3 min-h-12 w-full touch-manipulation overflow-hidden rounded-2xl py-3 text-base font-extrabold text-[#2a1f06] transition-all duration-150 ${
                  pressing ? "scale-[0.97] brightness-95" : "hover:brightness-110"
                }`}
                style={{
                  background:
                    "linear-gradient(180deg,#fff1b4 0%,#e5bd59 40%,#b8902e 70%,#8a6a21 100%)",
                  boxShadow:
                    "0 12px 24px -6px rgba(184,144,46,0.55), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -3px 6px rgba(0,0,0,0.35)",
                }}
              >
                <span className="relative z-10">تأكيد عملية التبديل</span>
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/35 blur-md" />
              </button>

              {/* إشعار النجاح داخل الشاشة */}
              <div
                className={`sim-toast pointer-events-none absolute inset-x-4 bottom-5 flex items-center gap-2 rounded-2xl bg-emerald-500/95 px-3 py-2.5 text-right text-white shadow-xl transition-all duration-300 ${
                  done ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/25">
                  <Check className="size-4" />
                </span>
                <span className="text-xs font-semibold leading-5">
                  تمّ تنفيذ التبديل بنجاح
                  <br />
                  <span className="font-normal text-white/90">
                    {format(amount, from)} {META[from].symbol} ← {format(convert(amount, from, to, rate), to)} {META[to].symbol}
                  </span>
                </span>
              </div>
            </div>

            {/* شريط الإيماءات */}
            <div className="flex justify-center pb-2">
              <div className="h-1 w-28 rounded-full bg-white/45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  title,
  code,
  value,
  onValue,
  onCode,
  readOnly,
}: {
  title: string;
  code: Code;
  value: string;
  onValue?: (v: string) => void;
  onCode: (c: Code) => void;
  readOnly?: boolean;
}) {
  return (
    <div
      className="sim-field rounded-2xl p-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        boxShadow:
          "inset 0 0 0 1px rgba(216,173,70,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="sim-muted mb-1.5 flex items-center justify-between text-xs text-white/60">
        <span>{title}</span>
        <span>{META[code].label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex shrink-0 overflow-hidden rounded-xl"
          style={{ boxShadow: "inset 0 0 0 1px rgba(216,173,70,0.4)" }}
        >
          {(["SYP", "USD"] as Code[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCode(c)}
              className={`min-h-11 min-w-[3.25rem] touch-manipulation px-2 text-xs font-bold transition-colors active:scale-95 ${
                c === code ? "sim-chip-on text-[#2a1f06]" : "sim-chip-off bg-transparent text-white/60 hover:text-white"
              }`}
              style={
                c === code
                  ? {
                      background:
                        "linear-gradient(180deg,#fff1b4,#d8ad46 60%,#8a6a21)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                    }
                  : undefined
              }
            >
              {META[c].flag} {c}
            </button>
          ))}
        </div>
        <input
          dir="ltr"
          inputMode="decimal"
          readOnly={readOnly}
          value={value}
          onChange={(e) => onValue?.(e.target.value)}
          className="w-full min-w-0 bg-transparent min-h-11 text-left text-lg font-bold tabular-nums text-white outline-none placeholder:text-white/40"
          placeholder="0"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={`المبلغ ${title}`}
        />
      </div>
    </div>
  );
}
