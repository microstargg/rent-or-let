import { redirect } from "next/navigation";
import { requireLandlordSession } from "@/lib/auth/server";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function LandlordPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireLandlordSession();
  if (!ctx) redirect("/login?next=/landlord-portal");

  const { landlord } = ctx.profile;

  return (
    <PortalShell
      portal="landlord"
      userName={`${landlord.firstName} ${landlord.lastName}`.trim()}
      email={ctx.session?.user?.email}
    >
      {children}
    </PortalShell>
  );
}
