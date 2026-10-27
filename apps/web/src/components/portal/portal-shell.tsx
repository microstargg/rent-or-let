"use client";

import {
  Camera,
  ClipboardList,
  LayoutDashboard,
  PawPrint,
  Receipt,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useTenant } from "@repo/config";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { SidebarNav, type SidebarNavSection } from "@/components/layout/sidebar-nav";

const portals = {
  landlord: {
    title: "Landlord portal",
    homeHref: "/landlord-portal",
    sections: [
      {
        items: [
          { href: "/landlord-portal", label: "Overview", icon: LayoutDashboard, match: "exact" },
          { href: "/landlord-portal/statements", label: "Statements", icon: ClipboardList },
          { href: "/landlord-portal/compliance", label: "Compliance", icon: ShieldCheck },
          { href: "/landlord-portal/inspections", label: "Inspections", icon: Camera },
        ],
      },
    ],
  },
  tenant: {
    title: "Tenant portal",
    homeHref: "/portal",
    sections: [
      {
        items: [
          { href: "/portal", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
          { href: "/portal/rent", label: "Rent", icon: Receipt },
          { href: "/portal/tickets", label: "Maintenance", icon: Wrench },
          { href: "/portal/pets", label: "Pets", icon: PawPrint },
        ],
      },
    ],
  },
} satisfies Record<string, { title: string; homeHref: string; sections: SidebarNavSection[] }>;

export function PortalShell({
  portal,
  userName,
  email,
  children,
}: {
  portal: keyof typeof portals;
  userName: string;
  email?: string | null;
  children: React.ReactNode;
}) {
  const { shortName } = useTenant();
  const config = portals[portal];

  return (
    <SidebarShell
      title={config.title}
      subtitle={shortName}
      homeHref={config.homeHref}
      mobileSubtitle={userName}
      footer={
        <>
          <p className="truncate text-sm font-medium">{userName}</p>
          {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
          <AdminSignOut />
        </>
      }
      renderNav={(onNavigate) => <SidebarNav sections={config.sections} onNavigate={onNavigate} />}
    >
      {children}
    </SidebarShell>
  );
}
