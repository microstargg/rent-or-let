import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Inbox,
  FileText,
  AlertCircle,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";
import { auth, requireStaffSession } from "@/lib/auth/server";
import { AdminSignOut } from "@/components/admin/admin-sign-out";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/complaints", label: "Complaints", icon: AlertCircle },
  { href: "/admin/portals", label: "Portal sync", icon: RefreshCw },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  if (!session) {
    const { data: authSession } = await auth.getSession();
    redirect(authSession?.user ? "/login?error=no-staff-access" : "/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-muted/30">
        <div className="p-4">
          <Link href="/admin" className="font-bold text-primary">
            PMS Admin
          </Link>
          <p className="text-xs text-muted-foreground">Rent or Let</p>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-4">
          <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          <AdminSignOut />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
