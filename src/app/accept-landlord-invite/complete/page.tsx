import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  getLandlordInviteByToken,
  acceptLandlordInvite,
  createLandlordProfile,
  getLandlordProfileByUserId,
} from "@/lib/db/queries";

export default async function AcceptLandlordInviteCompletePage({
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
    redirect(
      `/login?next=${encodeURIComponent(`/accept-landlord-invite/complete?token=${token}`)}`
    );
  }

  const invite = await getLandlordInviteByToken(token);
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

  const existing = await getLandlordProfileByUserId(userId);
  if (!existing) {
    await createLandlordProfile({
      userId,
      branchId: invite.branchId,
      landlordId: invite.landlordId,
      email: userEmail,
    });
  }

  await acceptLandlordInvite(invite.id);
  redirect("/landlord-portal");
}
