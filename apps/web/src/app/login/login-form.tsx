"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithEmail } from "./actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AuthDivider } from "@/components/auth/auth-divider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LoginFormProps = {
  notice?: string;
  error?: string;
  next?: string;
};

export function LoginForm({ notice, error, next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Staff, landlords, and tenants use the same sign-in.
          </p>
          {notice && <p className="mb-4 text-sm text-muted-foreground">{notice}</p>}
          <GoogleSignInButton label="Sign in with Google" next={next} />
          <AuthDivider />
          <form action={formAction} className="space-y-4">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {(state?.error || error) && (
              <p className="text-sm text-red-600">{state?.error || error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            First time?{" "}
            <Link href="/sign-up" className="text-primary underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
