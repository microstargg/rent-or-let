import { test, expect } from "./fixtures";

const protectedRoutes = [
  { path: "/admin", label: "StaffAdmin gate" },
  { path: "/admin/properties", label: "StaffAdmin properties" },
  { path: "/admin/tasks", label: "StaffAdmin tasks" },
  { path: "/admin/settings", label: "StaffAdmin settings" },
  { path: "/portal", label: "Tenant portal gate" },
  { path: "/landlord-portal", label: "Landlord portal gate" },
];

test.describe("Unauthenticated access control", () => {
  for (const route of protectedRoutes) {
    test(`${route.label}: ${route.path} redirects to login`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
