import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AppScreen } from "@/components/app-screen";
import { buttonVariants } from "@/components/ui/button";

export function CredentialProtection() {
  return (
    <AppScreen width="sm">
      <section dir="rtl" className="space-y-5 py-8 text-center">
        <ShieldCheck aria-hidden className="mx-auto size-12 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">حماية بيانات الدخول</h1>
        <p className="text-base leading-8 text-muted-foreground">
          لا تستقبل هذه البوابة كلمات مرور حسابات شام كاش أو رموز التحقق الخاصة بها.
          استخدم التطبيق الرسمي لإدارة تسجيل الدخول، ولا تشارك بيانات الدخول مع أي شخص.
        </p>
        <Link to="/aG9tZQ" className={buttonVariants({ variant: "outline" })}>العودة إلى الرئيسية</Link>
      </section>
    </AppScreen>
  );
}