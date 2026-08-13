import { redirect } from "next/navigation";
import { auth, requireStaffSession, requireLandlordSession } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { ensureJobInvoiceSchema } from "@/lib/db/ensure-schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();
  if (!session) {
    const { data: authSession } = await auth.getSession();
    if (authSession?.user) {
      const landlord = await requireLandlordSession();
      if (landlord) redirect("/landlord-portal");
      redirect("/login?error=no-staff-access");
    }
    redirect("/login");
  }

  try {
    await ensureJobInvoiceSchema();
  } catch (err) {
    console.error("[admin] failed to apply job invoice schema", err);
  }

  return <AdminShell email={session.user.email}>{children}</AdminShell>;
}
