"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLogo } from "@/components/brand/site-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenant } from "@repo/config";
import { officeStatus } from "@/lib/hours";

const navLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/landlords", label: "Landlords" },
  { href: "/tenants", label: "Tenants" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tenant = useTenant();
  const { site: siteContent, id } = tenant;
  const phone = siteContent.contact.phone;
  const hours = siteContent.contact.hours;
  // Worked out after mount so the server and browser never disagree about the time.
  const [status, setStatus] = useState<ReturnType<typeof officeStatus>>(null);
  useEffect(() => {
    const update = () => setStatus(officeStatus(hours));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [hours]);

  // Close the mobile menu whenever the route changes (e.g. back/forward).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const tel = phone ? `tel:${phone.replace(/\s/g, "")}` : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="container mx-auto flex h-[72px] max-w-6xl items-center gap-6 px-4 md:h-[76px]">
        <SiteLogo />

        <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Main">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "relative py-2 text-[15px] font-medium transition-colors hover:text-primary",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100 motion-reduce:after:transition-none",
                isActive(href) ? "text-primary after:scale-x-100" : "text-foreground/80"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {status ? (
          <p className="hidden items-center gap-2 text-[13px] text-muted-foreground xl:flex">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                status.open ? "bg-[var(--success)] shadow-[0_0_0_3px_color-mix(in_oklch,var(--success)_20%,transparent)]" : "bg-muted-foreground/50"
              )}
            />
            {status.label}
          </p>
        ) : null}

        <div className="hidden md:block">
          {tel ? (
            <Button asChild className="h-11 tabular-nums">
              <a href={tel}>
                <Phone className="mr-1 h-4 w-4" />
                {phone}
              </a>
            </Button>
          ) : (
            <Button asChild className="h-11">
              <Link href="/contact">Get in touch</Link>
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          {tel ? (
            <Button asChild variant="outline" size="sm" className="h-10">
              <a href={tel} aria-label={`Call ${phone}`}>
                <Phone className="h-4 w-4" />
                Call
              </a>
            </Button>
          ) : null}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border bg-card"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t bg-card px-4 pb-5 pt-2 md:hidden">
          <div className="flex flex-col">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "border-b py-3.5 text-lg font-semibold",
                  isActive(href) ? "text-primary" : "text-foreground"
                )}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            {status ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  aria-hidden
                  className={cn("h-2 w-2 rounded-full", status.open ? "bg-[var(--success)]" : "bg-muted-foreground/50")}
                />
                {status.label}
              </p>
            ) : null}
            <Button asChild className="mt-4 h-12 w-full">
              {tel ? (
                <a href={tel}>
                  <Phone className="mr-1 h-4 w-4" />
                  Call {phone}
                </a>
              ) : (
                <Link href="/contact" onClick={() => setOpen(false)}>
                  Get in touch
                </Link>
              )}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
