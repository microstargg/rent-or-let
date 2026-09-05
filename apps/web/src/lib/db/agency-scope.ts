import { eq } from "drizzle-orm";
import { getAgency } from "@repo/config/server";

export function currentAgencyId(): string {
  return getAgency().slug;
}

/** Convenience: eq(column, current agency slug) */
export function agencyEq(column: Parameters<typeof eq>[0]) {
  return eq(column, currentAgencyId());
}
