import { test, expect, hasAuthCredentials, loginWithPassword } from "./fixtures";

const staffRoutes = [
  "/admin",
  "/admin/properties",
  "/admin/landlords",
  "/admin/renters",
  "/admin/tenancies",
  "/admin/finance/invoices",
  "/admin/finance/arrears",
  "/admin/finance/exceptions",
  "/admin/finance/statements",
  "/admin/finance/payouts",
  "/admin/compliance",
  "/admin/lifecycle",
  "/admin/tasks",
  "/admin/enquiries",
  "/admin/applications",
  "/admin/tickets",
  "/admin/jobs/board",
  "/admin/complaints",
  "/admin/portals",
  "/admin/settings",
];

test.describe("StaffAdmin persona", () => {
  test.skip(!hasAuthCredentials("StaffAdmin"), "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await loginWithPassword(
      page,
      process.env.E2E_STAFF_EMAIL!,
      process.env.E2E_STAFF_PASSWORD!,
      "/admin"
    );
    await expect(page).toHaveURL(/\/admin/);
  });

  for (const path of staffRoutes) {
    test(`admin nav destination ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }
});
