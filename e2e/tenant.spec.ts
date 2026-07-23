import { test, expect, hasAuthCredentials, loginWithPassword } from "./fixtures";

test.describe("Tenant persona", () => {
  test.skip(!hasAuthCredentials("Tenant"), "Set E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(
      page,
      process.env.E2E_TENANT_EMAIL!,
      process.env.E2E_TENANT_PASSWORD!,
      "/portal"
    );
    await expect(page).toHaveURL(/\/portal/);
  });

  test("portal dashboard loads", async ({ page }) => {
    await page.goto("/portal");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("rent page loads", async ({ page }) => {
    await page.goto("/portal/rent");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("tickets page loads", async ({ page }) => {
    await page.goto("/portal/tickets");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
