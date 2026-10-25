import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Send } from "lucide-react";
import type { ReactNode } from "react";
import shamLogo from "@/assets/sham-login-logo.webp";

function DataLink({ className, children }: { className: string; children: ReactNode }) {
  return (
    <Link to="/YXV0aA" className={className}>
      {children}
    </Link>
  );
}

/** الشريط السفلي الموحّد — نفس شريط الصفحة الرئيسية */
export function HomeFooter() {
  return (
    <footer dir="rtl" className="mt-10 border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pt-8 text-center">
        <DataLink className="flex items-center gap-2">
          <img src={shamLogo} alt="شعار شام كاش" loading="lazy" decoding="async" className="h-8 w-auto" />
          <span className="font-bold text-foreground">شام كاش</span>
        </DataLink>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <DataLink className="text-muted-foreground transition hover:text-accent">توثيق الحساب</DataLink>
          <DataLink className="text-muted-foreground transition hover:text-accent">تبديل العملة</DataLink>
          <DataLink className="text-muted-foreground transition hover:text-accent">ابدأ الآن</DataLink>
        </nav>
        <div className="flex gap-3" aria-hidden>
          {[Facebook, Instagram, Send].map((I, i) => (
            <span key={i} className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground"><I className="size-4" /></span>
          ))}
        </div>
        <p dir="ltr" className="text-xs tracking-[0.18em] text-muted-foreground">POWERED BY SAND LOGIX</p>
      </div>
    </footer>
  );
}
