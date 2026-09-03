"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AcceptInviteClient({ token, email }: { token: string; email: string }) {
  const loginUrl = `/login?next=${encodeURIComponent(`/accept-invite/complete?token=${token}`)}`;
  const signUpUrl = `/sign-up?next=${encodeURIComponent(`/accept-invite/complete?token=${token}`)}&email=${encodeURIComponent(email)}`;

  return (
    <div className="mt-6 space-y-3">
      <Button asChild className="w-full">
        <Link href={loginUrl}>Sign in</Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href={signUpUrl}>Create account</Link>
      </Button>
    </div>
  );
}
