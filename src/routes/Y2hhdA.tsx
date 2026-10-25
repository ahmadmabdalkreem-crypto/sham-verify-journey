import { createFileRoute } from "@tanstack/react-router";
import { usePresenceTracker } from "@/lib/presence";
import { useAdminRedirect } from "@/lib/admin-redirect";
import { AppScreen } from "@/components/app-screen";
import { ClientChatPanel } from "@/components/chat/client-chat";

export const Route = createFileRoute("/Y2hhdA")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "الدردشة مع الدعم | شام كاش" },
      { name: "description", content: "محادثة خاصة وآمنة مع فريق دعم شام كاش بخصوص طلبك." },
      { property: "og:title", content: "الدردشة مع الدعم — شام كاش" },
      { property: "og:description", content: "محادثة خاصة وآمنة مع فريق دعم شام كاش بخصوص طلبك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  usePresenceTracker({ page: "/Y2hhdA" });
  useAdminRedirect();
  return (
    <AppScreen>
      <div dir="rtl" className="w-full">
        <h1 className="mb-4 text-center text-xl font-bold text-foreground sm:text-2xl">الدردشة مع فريق الدعم</h1>
        <ClientChatPanel />
      </div>
    </AppScreen>
  );
}
