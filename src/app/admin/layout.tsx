import { redirect } from "next/navigation";
import { auth, requireStaffSession } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/admin-shell";

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

  return <AdminShell email={session.user.email}>{children}</AdminShell>;
}
