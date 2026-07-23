import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  getStaffInviteByToken,
  acceptStaffInvite,
  createStaffProfile,
  getStaffProfileById,
} from "@/lib/db/queries";

export default async function AcceptStaffInviteCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) {
    redirect(`/login?next=${encodeURIComponent(`/accept-staff-invite/complete?token=${token}`)}`);
  }

  const invite = await getStaffInviteByToken(token);
  if (!invite) {
    return <p className="p-8 text-muted-foreground">Invite expired or invalid.</p>;
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return (
      <p className="p-8 text-muted-foreground">
        Sign in with <strong>{invite.email}</strong> to accept this invite.
      </p>
    );
  }

  const existing = await getStaffProfileById(userId);
  if (!existing) {
    await createStaffProfile({
      userId,
      email: userEmail,
      fullName: invite.fullName || userEmail,
      role: invite.role,
    });
  }

  await acceptStaffInvite(invite.id);
  redirect("/admin");
}
