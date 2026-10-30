"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
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
  const isVeri = id === "veri-properties";
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

  if (isVeri) {
    return (
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 animate-[veri-nav-in_0.7s_ease-out]">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-center px-4 pt-5 md:pt-6">
          <div className="flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-[#141414]/75 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl md:w-auto md:justify-center md:gap-1 md:px-2 md:py-1.5">
            <Link
              href="/"
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold tracking-tight text-white md:hidden"
              onClick={() => setOpen(false)}
            >
              Veri
            </Link>
            <nav className="hidden items-center gap-0.5 md:flex">
              <Link
                href="/"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white",
                  pathname === "/" && "bg-white/20 text-white"
                )}
              >
                Home
              </Link>
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white",
                    pathname === href && "bg-white/20 text-white"
                  )}
                >
                  {label}
                </Link>
              ))}
              <Button
                asChild
                size="sm"
                className="ml-1 rounded-full bg-[var(--accent)] px-4 text-[oklch(0.2_0.02_50)] hover:bg-[oklch(0.82_0.09_55)]"
              >
                <Link href="/contact">
                  Get in touch
                  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </nav>
            <button
              type="button"
              className="rounded-full p-2 text-white md:hidden"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="pointer-events-auto mx-4 mt-2 rounded-3xl border border-white/15 bg-[#141414]/95 p-4 shadow-xl backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                className="rounded-2xl px-4 py-3 text-sm font-medium text-white"
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-white/90"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/contact"
                className="mt-2 rounded-full bg-[var(--accent)] px-4 py-3 text-center text-sm font-semibold text-[oklch(0.2_0.02_50)]"
                onClick={() => setOpen(false)}
              >
                Get in touch
              </Link>
            </div>
          </nav>
        )}
      </header>
    );
  }

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
