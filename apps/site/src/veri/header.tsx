"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useTenant } from "@repo/config";
import { Tick, Wordmark } from "./ui";

const navLinks = [
  { href: "/properties", label: "Homes to let" },
  { href: "/landlords", label: "Landlords" },
  { href: "/tenants", label: "Tenants" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function VeriHeader() {
  const pathname = usePathname();
  const { name, site } = useTenant();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="v-head">
      <a href="#main" className="v-skip">
        Skip to content
      </a>
      <div className="v-wrap v-head__bar">
        <Link href="/" className="v-head__brand" aria-label={`${name}, home`}>
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="v-nav">
          {navLinks.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="v-nav__link v-hover"
              >
                {active ? <Tick drawn /> : <Tick hover />}
                {label}
              </Link>
            );
          })}
          <a href={`mailto:${site.contact.email}`} className="v-btn v-btn--pen v-btn--sm v-hover ml-3">
            <Tick hover box />
            Email us
          </a>
        </nav>

        <button
          type="button"
          className="v-menu-btn"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <nav id={menuId} aria-label="Main" hidden={!open} className="v-menu">
        <div className="v-wrap">
          <Link href="/" className="v-menu__link" aria-current={pathname === "/" ? "page" : undefined}>
            {pathname === "/" ? <Tick drawn /> : null}
            Home
          </Link>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="v-menu__link"
              aria-current={isActive(href) ? "page" : undefined}
            >
              {isActive(href) ? <Tick drawn /> : null}
              {label}
            </Link>
          ))}
          <a href={`mailto:${site.contact.email}`} className="v-btn v-btn--pen mt-6 w-full">
            Email {site.contact.email}
          </a>
        </div>
      </nav>
    </header>
  );
}
