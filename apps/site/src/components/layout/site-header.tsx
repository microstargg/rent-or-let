"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { SiteLogo } from "@/components/brand/site-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenant } from "@repo/config";

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

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <SiteLogo />

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === href ? "text-primary" : "text-foreground/80"
              )}
            >
              {label}
            </Link>
          ))}
          {phone ? (
            <Button asChild size="sm">
              <Link href={`tel:${phone.replace(/\s/g, "")}`}>
                <Phone className="mr-1 h-4 w-4" />
                {phone}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/contact">Get in touch</Link>
            </Button>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
