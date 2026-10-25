import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";
import { unlockAdmin } from "@/lib/admin-gate.functions";
import { AppScreen } from "@/components/app-screen";
import { ErrorAlert } from "@/components/error-alert";

type GateError = { title: string; message: string; hint?: string } | null;

export function DashGate({ onUnlocked }: { onUnlocked: (username: string) => void }) {
  const unlock = useServerFn(unlockAdmin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<GateError>(null);
  const [loading, setLoading] = useState(false);

  return (
    <AppScreen width="sm">
      <form
        className="text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!username.trim() || !password.trim()) {
            setError({
              title: "حقول ناقصة",
              message: "أدخل اسم المستخدم وكلمة المرور للمتابعة.",
            });
            return;
          }
          setLoading(true);
          setError(null);
          try {
            const res = await unlock({ data: { username, password } });
            if (res.ok) onUnlocked(username);
            else if ("locked" in res && res.locked) setError({
              title: "تم إيقاف المحاولات مؤقتاً",
              message: `حاولت كثيراً بكلمة مرور غير صحيحة. انتظر ${Math.ceil((res.retryAfterSec ?? 900) / 60)} دقيقة ثم أعد المحاولة.`,
            });
            else setError({
              title: "تعذّر الدخول",
              message: "اسم المستخدم أو كلمة المرور غير صحيحة.",
              hint: "اكتب الاسم وكلمة المرور كما زوّدك بهما مسؤول اللوحة. إن نسيتَ أحدهما اطلب منه إعادة تعيينه.",
            });
          } catch {
            setError({
              title: "تعذّر الاتصال بالخادم",
              message: "لم نستطع التحقق من بياناتك الآن.",
              hint: "تحقق من اتصالك بالإنترنت ثم اضغط «دخول» مرة أخرى.",
            });
          } finally {
            setLoading(false);
          }
        }}
      >
        <Lock className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-xl font-bold">لوحة الإدارة</h1>
        <p className="mt-2 text-sm text-muted-foreground">سجّل الدخول للمتابعة.</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم"
          className="mt-6 h-12 w-full rounded-xl glass-field px-4 text-center text-sm outline-none focus:border-primary" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور"
          className="mt-3 h-12 w-full rounded-xl glass-field px-4 text-center text-sm outline-none focus:border-primary" />
        {error ? (
          <div className="mt-4">
            <ErrorAlert title={error.title} message={error.message} hint={error.hint} />
          </div>
        ) : null}
        <button type="submit" disabled={loading}
          className="btn-primary-glow mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-60">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />} دخول
        </button>
      </form>
    </AppScreen>
  );
}
