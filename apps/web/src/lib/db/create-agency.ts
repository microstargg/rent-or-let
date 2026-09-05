import { eq } from "drizzle-orm";
import { db } from "./index";
import { agencies, branches } from "./schema";

export type CreateAgencyInput = {
  slug: string;
  name: string;
  platformHost?: string;
  publicSiteUrl?: string | null;
  websiteEnabled?: boolean;
  /** Optional default branch fields; defaults to agency name + placeholder address. */
  branch?: {
    id?: string;
    name?: string;
    address?: string;
    phone?: string;
  };
};

/**
 * Provision an empty agency on the shared database: agencies row + default branch.
 * Future self-serve signup: Auth user → createAgency → staff_profiles → redirect to {slug}.letflow.app.
 */
export async function createAgency(input: CreateAgencyInput) {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid agency slug "${input.slug}"`);
  }

  const platformHost = input.platformHost?.trim() || `${slug}.letflow.app`;
  const websiteEnabled = input.websiteEnabled ?? true;

  const [inserted] = await db
    .insert(agencies)
    .values({
      slug,
      name: input.name.trim(),
      platformHost,
      publicSiteUrl: input.publicSiteUrl?.trim() || null,
      websiteEnabled,
    })
    .onConflictDoNothing()
    .returning();

  const agency =
    inserted ??
    (await db.select().from(agencies).where(eq(agencies.slug, slug)).limit(1))[0];

  if (!agency) {
    throw new Error(`Failed to create or load agency "${slug}"`);
  }

  const existingBranch = (
    await db.select().from(branches).where(eq(branches.agencyId, slug)).limit(1)
  )[0];

  if (existingBranch) {
    return { agency, branch: existingBranch, created: Boolean(inserted) };
  }

  const [branch] = await db
    .insert(branches)
    .values({
      ...(input.branch?.id ? { id: input.branch.id } : {}),
      agencyId: slug,
      name: input.branch?.name?.trim() || agency.name,
      address: input.branch?.address?.trim() || "Address TBD",
      phone: input.branch?.phone?.trim() || "0000 000 0000",
    })
    .returning();

  return { agency, branch, created: true };
}
