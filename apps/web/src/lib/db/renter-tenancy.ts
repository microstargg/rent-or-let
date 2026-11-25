import { eq, or, sql } from "drizzle-orm";
import { tenancies } from "./schema";

/** Renter is the lead tenant or a joint tenant on the tenancy row in scope. */
export function renterOnTenancy(renterId: string) {
  return or(
    eq(tenancies.primaryRenterId, renterId),
    sql`exists (select 1 from tenancy_parties tp where tp.tenancy_id = ${tenancies.id} and tp.renter_id = ${renterId} and tp.role = 'tenant')`
  )!;
}
