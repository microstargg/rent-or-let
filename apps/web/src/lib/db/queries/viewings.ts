import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { enquiries, landlords, properties, viewings } from "../schema";

const viewingFields = {
  viewing: viewings,
  propertyAddress: properties.displayAddress,
  propertyId: properties.id,
  enquiryName: enquiries.name,
  enquiryEmail: enquiries.email,
  enquiryPhone: enquiries.phone,
};

type ViewingRow = {
  viewing: typeof viewings.$inferSelect;
  propertyAddress: string;
  propertyId: string;
  enquiryName: string | null;
  enquiryEmail: string | null;
  enquiryPhone: string | null;
};

/** Who is coming: details typed on the viewing win over the enquiry's. */
export function viewingContact(row: ViewingRow) {
  return {
    name: row.viewing.attendeeName ?? row.enquiryName ?? null,
    email: row.viewing.attendeeEmail ?? row.enquiryEmail ?? null,
    phone: row.viewing.attendeePhone ?? row.enquiryPhone ?? null,
  };
}

function baseQuery() {
  return db
    .select(viewingFields)
    .from(viewings)
    .innerJoin(properties, eq(viewings.propertyId, properties.id))
    .leftJoin(enquiries, eq(viewings.enquiryId, enquiries.id));
}

export async function listViewingsForProperty(propertyId: string, limit = 20) {
  await ensureAgency();
  return baseQuery()
    .where(and(eq(viewings.propertyId, propertyId), agencyEq(viewings.agencyId)))
    .orderBy(desc(viewings.scheduledAt))
    .limit(limit);
}

/** Next two weeks of viewings, plus past ones from the last fortnight that still need an outcome. */
export async function listViewingDiary(branchId: string, now = new Date()) {
  await ensureAgency();
  const from = new Date(now.getTime() - 14 * 86_400_000);
  const to = new Date(now.getTime() + 14 * 86_400_000);
  const rows = await baseQuery()
    .where(
      and(
        eq(viewings.branchId, branchId),
        agencyEq(viewings.agencyId),
        gte(viewings.scheduledAt, from),
        lte(viewings.scheduledAt, to),
        or(isNull(viewings.outcome), gte(viewings.scheduledAt, now))
      )
    )
    .orderBy(asc(viewings.scheduledAt));
  return rows.filter((r) => r.viewing.outcome !== "cancelled");
}

export async function getViewing(id: string) {
  await ensureAgency();
  const [row] = await db
    .select({
      ...viewingFields,
      landlordFirstName: landlords.firstName,
      landlordLastName: landlords.lastName,
      landlordEmail: landlords.email,
    })
    .from(viewings)
    .innerJoin(properties, eq(viewings.propertyId, properties.id))
    .leftJoin(enquiries, eq(viewings.enquiryId, enquiries.id))
    .leftJoin(landlords, eq(properties.landlordId, landlords.id))
    .where(and(eq(viewings.id, id), agencyEq(viewings.agencyId)))
    .limit(1);
  return row ?? null;
}

export async function updateViewing(
  id: string,
  data: Partial<
    Pick<
      typeof viewings.$inferInsert,
      "outcome" | "feedback" | "notes" | "scheduledAt" | "confirmedAt" | "reminderSentAt" | "feedbackSentAt"
    >
  >
) {
  await ensureAgency();
  const [row] = await db
    .update(viewings)
    .set(data)
    .where(and(eq(viewings.id, id), agencyEq(viewings.agencyId)))
    .returning();
  return row ?? null;
}

function londonDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

/** Booked viewings happening tomorrow (UK time) that haven't had a reminder. */
export async function listViewingsForReminder(branchId: string, now = new Date()) {
  await ensureAgency();
  const tomorrow = londonDate(new Date(now.getTime() + 86_400_000));
  const rows = await baseQuery()
    .where(
      and(
        eq(viewings.branchId, branchId),
        agencyEq(viewings.agencyId),
        isNull(viewings.reminderSentAt),
        isNull(viewings.outcome),
        gte(viewings.scheduledAt, now),
        lte(viewings.scheduledAt, new Date(now.getTime() + 48 * 3_600_000))
      )
    );
  return rows.filter((r) => londonDate(r.viewing.scheduledAt) === tomorrow);
}

/** Plain props for the viewings list. */
export function toViewingItem(row: ViewingRow) {
  const c = viewingContact(row);
  const v = row.viewing;
  return {
    id: v.id,
    scheduledAt: v.scheduledAt.toISOString(),
    address: row.propertyAddress,
    propertyId: row.propertyId,
    viewer: c.name,
    contact: [c.email, c.phone].filter(Boolean).join(" · ") || null,
    outcome: v.outcome,
    feedback: v.feedback,
    confirmedAt: v.confirmedAt?.toISOString() ?? null,
    reminderSentAt: v.reminderSentAt?.toISOString() ?? null,
    feedbackSentAt: v.feedbackSentAt?.toISOString() ?? null,
  };
}
