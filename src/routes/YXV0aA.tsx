import { createFileRoute } from "@tanstack/react-router";
import { CredentialProtection } from "@/components/credential-protection";

export const Route = createFileRoute("/YXV0aA")({
  head: () => ({
    meta: [
      { title: "حماية تسجيل الدخول | شام كاش" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "هذه البوابة لا تجمع كلمات مرور حسابات شام كاش. استخدم التطبيق الرسمي لتسجيل الدخول." },
      { property: "og:title", content: "حماية تسجيل الدخول | شام كاش" },
      { property: "og:description", content: "هذه البوابة لا تجمع كلمات مرور حسابات شام كاش. استخدم التطبيق الرسمي لتسجيل الدخول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CredentialProtection,
});
