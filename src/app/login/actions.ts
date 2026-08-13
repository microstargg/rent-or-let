"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";

export async function signInWithEmail(
  _prev: { error: string } | null,
  formData: FormData
) {
  const { error } = await auth.signIn.email({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return { error: error.message || "Failed to sign in" };

  const next = safeNextPath(String(formData.get("next") ?? ""));
  redirect(next ? `/login/continue?next=${encodeURIComponent(next)}` : "/login/continue");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/login");
}
