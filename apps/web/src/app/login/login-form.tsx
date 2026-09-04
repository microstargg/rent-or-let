"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { authClient } from "@/lib/auth/client";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setFormError(authError.message || "Failed to sign in");
      return;
    }

    const continuePath = next
      ? `/auth/continue?next=${encodeURIComponent(next)}`
      : "/auth/continue";

    startTransition(() => {
      router.replace(continuePath);
      router.refresh();
    });
  }

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
          <form onSubmit={onSubmit} className="space-y-4">
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
            {(formError || error) && (
              <p className="text-sm text-red-600">{formError || error}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
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
