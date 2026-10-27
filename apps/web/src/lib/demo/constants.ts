/** The public demo agency on demo.letflow.app. Fake data only, wiped and re-seeded nightly. */
export const DEMO_AGENCY_SLUG = "demo";

export function isDemoAgencySlug(slug: string | null | undefined): boolean {
  return slug === DEMO_AGENCY_SLUG;
}

/** Fixed ids so the one-click logins can link to the same records after every reset. */
export const DEMO_BRANCH_ID = "de300000-0000-4000-8000-000000000001";
export const DEMO_LANDLORD_ID = "de300002-0000-4000-8000-000000000001";
export const DEMO_RENTER_ID = "de300004-0000-4000-8000-000000000001";

export type DemoRole = "staff" | "landlord" | "renter";

export const DEMO_ACCOUNTS: Record<DemoRole, { email: string; name: string; label: string }> = {
  staff: { email: "agent@demo.letflow.app", name: "Alex Morgan", label: "Letting agent" },
  landlord: { email: "landlord@demo.letflow.app", name: "Margaret Ellison", label: "Landlord" },
  renter: { email: "renter@demo.letflow.app", name: "Chloe Bramwell", label: "Tenant" },
};

export function isDemoRole(value: unknown): value is DemoRole {
  return value === "staff" || value === "landlord" || value === "renter";
}
