"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sidebar layout shared by the staff app and the landlord / tenant portals:
 * fixed sidebar on desktop, slide-out drawer with a sticky top bar on mobile.
 */
export function SidebarShell({
  title,
  subtitle,
  homeHref,
  mobileSubtitle,
  mobileAction,
  footer,
  renderNav,
  children,
}: {
  title: string;
  subtitle?: string;
  homeHref: string;
  mobileSubtitle?: string;
  mobileAction?: React.ReactNode;
  footer: React.ReactNode;
  renderNav: (onNavigate?: () => void) => React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const brand = (
    <div className="px-4 py-4">
      <Link href={homeHref} className="block font-bold text-primary">
        {title}
      </Link>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 print:hidden md:flex">
        <div className="border-b">{brand}</div>
        <div className="flex-1 overflow-y-auto py-3">{renderNav()}</div>
        <div className="border-t px-4 py-3">{footer}</div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 print:hidden md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            open ? "opacity-100" : "opacity-0"
          )}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r bg-background shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b pr-2">
            {brand}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto py-3">{renderNav(() => setOpen(false))}</div>
          <div className="border-t px-4 py-3">{footer}</div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-3 py-2 backdrop-blur print:hidden md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary">{title}</p>
            {mobileSubtitle && (
              <p className="truncate text-xs text-muted-foreground">{mobileSubtitle}</p>
            )}
          </div>
          {mobileAction}
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8 print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
