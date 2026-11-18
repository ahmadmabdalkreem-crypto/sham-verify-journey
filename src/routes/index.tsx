import { createFileRoute, redirect } from "@tanstack/react-router";

const TITLE = "شام كاش | بوابة الخدمات المالية";
const DESCRIPTION = "تعرّف على خدمات شام كاش وانتقل إلى تسجيل الدخول من الصفحة الرئيسية.";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/aG9tZQ", replace: true });
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
