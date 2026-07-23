import { test, expect } from "./fixtures";

const publicRoutes = [
  { path: "/", text: /Affordable homes/i },
  { path: "/properties", text: /Properties to let|Browse|available/i },
  { path: "/properties/ferndale-avenue-middlesbrough-ts3-9ds", text: /Ferndale/i },
  { path: "/landlords", text: /property management|Landlord/i },
  { path: "/tenants", text: /Quality homes|Tenant|tenancy/i },
  { path: "/about", text: /About|experience|Family/i },
  { path: "/contact", text: /hear from you|Contact/i },
  { path: "/apply", text: /Tenant application|Apply/i },
  { path: "/complaints", text: /Complaint/i },
  { path: "/legal/terms", text: /Terms/i },
  { path: "/legal/privacy", text: /Privacy/i },
  { path: "/legal/cmp", text: /Client Money Protection/i },
  { path: "/login", text: /Staff login|Sign in/i },
  { path: "/sign-up", text: /Create staff account|Sign up/i },
];

test.describe("PublicVisitor persona", () => {
  for (const route of publicRoutes) {
    test(`loads ${route.path}`, async ({ asPublicVisitor: page }) => {
      const response = await page.goto(route.path);
      expect(response?.ok() || response?.status() === 304).toBeTruthy();
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("body")).toContainText(route.text);
    });
  }

  test("contact form is interactive", async ({ asPublicVisitor: page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("button", { name: /send message/i })).toBeVisible();
  });

  test("apply form is interactive", async ({ asPublicVisitor: page }) => {
    await page.goto("/apply");
    await expect(page.getByLabel(/first name/i).or(page.getByText(/first name/i)).first()).toBeVisible();
  });
});
