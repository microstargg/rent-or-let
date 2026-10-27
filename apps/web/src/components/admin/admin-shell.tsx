"use client";

import Link from "next/link";
import { useTenant } from "@repo/config";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSignOut } from "@/components/admin/admin-sign-out";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { Button } from "@/components/ui/button";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const { shortName, productName } = useTenant();

  return (
    <SidebarShell
      title={`${shortName} Admin`}
      subtitle={productName}
      homeHref="/"
      mobileSubtitle="Operations & portfolio"
      mobileAction={
        <Button asChild variant="secondary" size="sm" className="h-11 shrink-0 px-3">
          <Link href="/jobs/board">Jobs</Link>
        </Button>
      }
      footer={
        <>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <AdminSignOut />
        </>
      }
      renderNav={(onNavigate) => <AdminNav onNavigate={onNavigate} />}
    >
      {children}
    </SidebarShell>
  );
}
