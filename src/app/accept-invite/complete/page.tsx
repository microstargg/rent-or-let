import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  getRenterInviteByToken,
  acceptRenterInvite,
  createRenterProfile,
  getRenterProfileByUserId,
} from "@/lib/db/queries";

export default async function AcceptInviteCompletePage({
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
    redirect(`/login?next=${encodeURIComponent(`/accept-invite/complete?token=${token}`)}`);
  }

  const invite = await getRenterInviteByToken(token);
  if (!invite) {
    return <p className="p-8 text-muted-foreground">Invite expired or invalid.</p>;
  }

  const existing = await getRenterProfileByUserId(userId);
  if (!existing) {
    await createRenterProfile({
      userId,
      branchId: invite.branchId,
      renterId: invite.renterId,
      email: userEmail,
    });
  }

  await acceptRenterInvite(invite.id);
  redirect("/portal");
}
