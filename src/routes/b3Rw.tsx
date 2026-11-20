import { createFileRoute } from "@tanstack/react-router";
import { CredentialProtection } from "@/components/credential-protection";

export const Route = createFileRoute("/b3Rw")({
  head: () => ({
    meta: [
      { title: "حماية رموز التحقق | شام كاش" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "لا تشارك رموز التحقق الخاصة بحساب شام كاش؛ هذه البوابة لا تستقبلها." },
      { property: "og:title", content: "حماية رموز التحقق | شام كاش" },
      { property: "og:description", content: "لا تشارك رموز التحقق الخاصة بحساب شام كاش؛ هذه البوابة لا تستقبلها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CredentialProtection,
});
