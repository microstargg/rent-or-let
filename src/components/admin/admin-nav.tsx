"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Inbox,
  FileText,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
  Users,
  UserCircle,
  KeyRound,
  Receipt,
  Wrench,
  Settings,
  Scale,
  ClipboardList,
  Banknote,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: "exact" }],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/admin/properties", label: "Properties", icon: Building2 },
      { href: "/admin/landlords", label: "Landlords", icon: Users },
      { href: "/admin/renters", label: "Renters", icon: UserCircle },
      { href: "/admin/tenancies", label: "Tenancies", icon: KeyRound },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/finance/invoices", label: "Invoices", icon: Receipt },
      { href: "/admin/finance/arrears", label: "Arrears", icon: AlertTriangle },
      { href: "/admin/finance/exceptions", label: "Exceptions", icon: Scale },
      { href: "/admin/finance/statements", label: "Statements", icon: ClipboardList },
      { href: "/admin/finance/payouts", label: "Payouts", icon: Banknote },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/admin/compliance", label: "Certificates", icon: ShieldCheck },
      { href: "/admin/lifecycle", label: "Deposits & notices", icon: FileText },
    ],
  },
  {
    label: "Lettings",
    items: [
      { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
      { href: "/admin/applications", label: "Applications", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: Wrench },
      { href: "/admin/jobs/board", label: "Jobs board", icon: ClipboardList },
      { href: "/admin/complaints", label: "Complaints", icon: AlertCircle },
      { href: "/admin/portals", label: "Portal sync", icon: RefreshCw },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5 px-2 pb-4">
      {navSections.map((section, idx) => (
        <div key={section.label ?? `top-${idx}`}>
          {section.label && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
