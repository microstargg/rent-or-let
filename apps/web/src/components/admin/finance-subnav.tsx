"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const financeLinks = [
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/arrears", label: "Arrears" },
  { href: "/finance/exceptions", label: "Exceptions" },
  { href: "/finance/statements", label: "Statements" },
  { href: "/finance/payouts", label: "Payouts" },
];

export function FinanceSubnav() {
  const pathname = usePathname();

  return (
    <div className="mt-4 flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {financeLinks.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
