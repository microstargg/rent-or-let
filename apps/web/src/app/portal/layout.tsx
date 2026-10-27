import { redirect } from "next/navigation";
import { requireRenterSession } from "@/lib/auth/server";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRenterSession();
  if (!ctx) {
    redirect("/login?next=/portal");
  }

  const { renter } = ctx.profile;

  return (
    <PortalShell
      portal="tenant"
      userName={`${renter.firstName} ${renter.lastName}`.trim()}
      email={ctx.session?.user?.email}
    >
      {children}
    </PortalShell>
  );
}
