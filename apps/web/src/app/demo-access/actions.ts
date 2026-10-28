"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bindRequestAgency } from "@/lib/agency";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_MAX_AGE,
  DEMO_ACCESS_PATH,
  demoAccessCode,
  demoAccessToken,
} from "@/lib/demo/access";
import { isDemoAgencySlug } from "@/lib/demo/constants";

export async function enterDemoAccessCode(formData: FormData) {
  const agency = await bindRequestAgency();
  if (!isDemoAgencySlug(agency.slug)) redirect("/login");

  const next = safeNextPath(String(formData.get("next") ?? "")) ?? "/login";
  const expected = demoAccessCode();
  const entered = String(formData.get("code") ?? "").trim();
  // Compare digests so the check takes the same time whatever was typed.
  const ok =
    expected != null &&
    entered.length > 0 &&
    (await demoAccessToken(entered)) === (await demoAccessToken(expected));

  if (!ok) {
    const params = new URLSearchParams({ error: "1" });
    if (next !== "/login") params.set("next", next);
    redirect(`${DEMO_ACCESS_PATH}?${params}`);
  }

  (await cookies()).set(DEMO_ACCESS_COOKIE, await demoAccessToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEMO_ACCESS_MAX_AGE,
  });
  redirect(next);
}
