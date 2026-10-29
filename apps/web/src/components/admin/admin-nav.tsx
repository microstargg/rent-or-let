"use client";

import {
  CalendarCheck,
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
  Camera,
  PawPrint,
  HardHat,
} from "lucide-react";
import { SidebarNav, type SidebarNavSection } from "@/components/layout/sidebar-nav";

const navSections: SidebarNavSection[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, match: "exact" }],
  },
  {
    label: "Portfolio",
    items: [
      { href: "/properties", label: "Properties", icon: Building2 },
      { href: "/landlords", label: "Landlords", icon: Users },
      { href: "/renters", label: "Renters", icon: UserCircle },
      { href: "/tenancies", label: "Tenancies", icon: KeyRound },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/finance/month-end", label: "Month end", icon: CalendarCheck },
      { href: "/finance/invoices", label: "Invoices", icon: Receipt },
      { href: "/finance/arrears", label: "Arrears", icon: AlertTriangle },
      { href: "/finance/exceptions", label: "Exceptions", icon: Scale },
      { href: "/finance/statements", label: "Statements", icon: ClipboardList },
      { href: "/finance/payouts", label: "Payouts", icon: Banknote },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/compliance", label: "Certificates", icon: ShieldCheck },
      { href: "/lifecycle", label: "Deposits & notices", icon: FileText },
      { href: "/pets", label: "Pet requests", icon: PawPrint },
    ],
  },
  {
    label: "Lettings",
    items: [
      { href: "/enquiries", label: "Enquiries", icon: Inbox },
      { href: "/applications", label: "Applications", icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/tickets", label: "Tickets", icon: Wrench },
      { href: "/jobs/board", label: "Jobs board", icon: ClipboardList },
      { href: "/contractors", label: "Contractors", icon: HardHat },
      { href: "/inspections", label: "Inspections", icon: Camera },
      { href: "/complaints", label: "Complaints", icon: AlertCircle },
      { href: "/portals", label: "Portal sync", icon: RefreshCw },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return <SidebarNav sections={navSections} onNavigate={onNavigate} />;
}
