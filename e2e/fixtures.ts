import { test as base, expect, type Page } from "@playwright/test";

export type Persona = "PublicVisitor" | "StaffAdmin" | "Tenant" | "Landlord";

type PersonaFixtures = {
  asPublicVisitor: Page;
};

/**
 * Persona fixtures. Authenticated personas require E2E_* credentials + a seeded DB.
 * PublicVisitor always runs.
 */
export const test = base.extend<PersonaFixtures>({
  asPublicVisitor: async ({ page }, use) => {
    await use(page);
  },
});

export { expect };

export function hasAuthCredentials(persona: Exclude<Persona, "PublicVisitor">) {
  if (persona === "StaffAdmin") {
    return Boolean(process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASSWORD);
  }
  if (persona === "Tenant") {
    return Boolean(process.env.E2E_TENANT_EMAIL && process.env.E2E_TENANT_PASSWORD);
  }
  return Boolean(process.env.E2E_LANDLORD_EMAIL && process.env.E2E_LANDLORD_PASSWORD);
}

export async function loginWithPassword(
  page: Page,
  email: string,
  password: string,
  nextPath?: string
) {
  const url = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  await page.goto(url);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}
