import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { isAdminUnlocked } from "@/lib/admin-gate.functions";
import { DashGate } from "@/features/dashboard/gate";
import { DashShell } from "@/features/dashboard/shell";

export const Route = createFileRoute("/ZGFzaGJvYXJk")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "لوحة الإدارة الجديدة | شام كاش" },
      { name: "description", content: "النسخة الجديدة من لوحة إدارة العملاء والطلبات." },
      { property: "og:title", content: "لوحة الإدارة الجديدة" },
      { property: "og:description", content: "متابعة العملاء والطلبات لحظياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-unlocked"], queryFn: () => isAdminUnlocked(), staleTime: 60000 });
  if (q.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  if (q.data?.unlocked !== true) return <DashGate onUnlocked={(u) => qc.setQueryData(["admin-unlocked"], { unlocked: true, username: u })} />;
  return <DashShell actor={q.data?.username ?? "admin"} onLocked={() => qc.setQueryData(["admin-unlocked"], { unlocked: false })} />;
}
