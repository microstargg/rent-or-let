import { test, expect, hasAuthCredentials, loginWithPassword } from "./fixtures";

test.describe("Landlord persona", () => {
  test.skip(!hasAuthCredentials("Landlord"), "Set E2E_LANDLORD_EMAIL and E2E_LANDLORD_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(
      page,
      process.env.E2E_LANDLORD_EMAIL!,
      process.env.E2E_LANDLORD_PASSWORD!,
      "/landlord-portal"
    );
    await expect(page).toHaveURL(/\/landlord-portal/);
  });

  test("landlord dashboard loads", async ({ page }) => {
    await page.goto("/landlord-portal");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("statements page loads", async ({ page }) => {
    await page.goto("/landlord-portal/statements");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("compliance page loads", async ({ page }) => {
    await page.goto("/landlord-portal/compliance");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
