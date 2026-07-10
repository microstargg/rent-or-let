import { AcceptInviteClient } from "@/components/portal/accept-invite-client";
import { getRenterInviteByToken } from "@/lib/db/queries";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <p className="p-8 text-muted-foreground">Invalid invite link.</p>;
  }

  const invite = await getRenterInviteByToken(token);
  if (!invite) {
    return <p className="p-8 text-muted-foreground">This invite has expired or already been used.</p>;
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Accept portal invite</h1>
      <p className="mt-2 text-muted-foreground">
        Sign in or create an account with <strong>{invite.email}</strong> to access your tenant portal.
      </p>
      <AcceptInviteClient token={token} email={invite.email} />
    </div>
  );
}
