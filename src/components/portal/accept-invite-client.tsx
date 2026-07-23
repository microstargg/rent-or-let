"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AcceptInviteClient({
  token,
  email,
  completePath = "/accept-invite/complete",
}: {
  token: string;
  email: string;
  completePath?: string;
}) {
  const next = `${completePath}?token=${token}`;
  const loginUrl = `/login?next=${encodeURIComponent(next)}`;
  const signUpUrl = `/sign-up?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;

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
