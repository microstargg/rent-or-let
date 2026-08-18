import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRenterSession } from "@/lib/auth/server";
import { AdminSignOut } from "@/components/admin/admin-sign-out";

const navItems = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/rent", label: "Rent" },
  { href: "/portal/tickets", label: "Tickets" },
  { href: "/portal/pets", label: "Pets" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRenterSession();
  if (!ctx) {
    redirect("/login?next=/portal");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-muted/30">
        <div className="p-4">
          <p className="font-bold text-primary">Tenant portal</p>
          <p className="text-xs text-muted-foreground">
            {ctx.profile.renter.firstName} {ctx.profile.renter.lastName}
          </p>
        </div>
        <nav className="space-y-1 px-2">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-4">
          <AdminSignOut />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
