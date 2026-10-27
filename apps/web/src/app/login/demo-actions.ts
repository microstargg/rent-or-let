"use server";

import { neon } from "@neondatabase/serverless";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { bindRequestAgency } from "@/lib/agency";
import { DEMO_ACCOUNTS, isDemoAgencySlug, isDemoRole, type DemoRole } from "@/lib/demo/constants";
import { demoDatabaseUrl, demoProfileStatement } from "@/lib/demo/reset";

const LANDING: Record<DemoRole, string> = {
  staff: "/",
  landlord: "/landlord-portal",
  renter: "/portal",
};

/** One-click entry to the public demo: signs in to a shared demo account for the chosen role. */
export async function signInToDemo(formData: FormData) {
  const agency = await bindRequestAgency();
  const role = formData.get("role");
  if (!isDemoAgencySlug(agency.slug) || !isDemoRole(role)) redirect("/login");

  const password = process.env.DEMO_LOGIN_PASSWORD?.trim();
  if (!password) redirect("/login?error=demo-unavailable");

  const account = DEMO_ACCOUNTS[role];
  await auth.signOut().catch(() => undefined);

  const signedIn = await auth.signIn.email({ email: account.email, password });
  // First visit after the demo project was created: make the account, which signs it in.
  const result = signedIn.error
    ? await auth.signUp.email({ email: account.email, password, name: account.name })
    : signedIn;
  const userId = result.data?.user?.id;
  if (result.error || !userId) {
    console.error("Demo sign-in failed:", result.error?.message ?? "no user id");
    redirect("/login?error=demo-unavailable");
  }

  const statement = demoProfileStatement(account.email, userId);
  if (statement) await neon(demoDatabaseUrl())(statement[0], statement[1]);

  redirect(LANDING[role]);
}
