import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import shamLogo from "@/assets/sham-logo.webp";


const nav = [
  { to: "/", label: "الرئيسية" },
  { to: "/YXV0aA", label: "طلب توثيق" },
  { to: "/ZGFzaGJvYXJk", label: "لوحة التحكم" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={shamLogo}
            alt="شعار شام كاش"
            width={36}
            height={36}
            className="size-9 object-contain"
          />
          <span className="leading-tight">
            <span className="block text-sm font-bold text-foreground">شام كاش</span>

            <span className="block text-[11px] text-muted-foreground">بوابة خدمات شام كاش</span>
          </span>
        </Link>


        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent/15 text-accent border-accent/35" }}
              className="rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"

            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="القائمة"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-11 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {open ? (
        <nav className="grid gap-1 border-t border-border bg-card px-4 py-3 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent/15 text-accent" }}
              className="flex min-h-12 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} شام كاش — جميع الحقوق محفوظة. بياناتك محمية ومشفّرة.
      </div>
    </footer>
  );
}
