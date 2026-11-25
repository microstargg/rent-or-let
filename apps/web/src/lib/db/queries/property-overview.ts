import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { inspections, landlords, properties, renters, tenancies, tickets } from "../schema";
import { displayPersonName } from "@/lib/person-name";
import { getOverdueBalance } from "./tenancy";

const ACTIVE = new Set(["active", "periodic", "notice_given"]);
const CLOSED_TICKET = new Set(["completed", "cancelled"]);

/**
 * Everything the property page's summary and tabs need beyond the property itself:
 * landlord, tenancies (current first), repairs and inspections. Queries run in parallel.
 */
export async function getPropertyOverview(propertyId: string) {
  await ensureAgency();
  const [landlordRows, tenancyRows, ticketRows, inspectionRows] = await Promise.all([
    db
      .select({ landlord: landlords })
      .from(properties)
      .innerJoin(landlords, eq(properties.landlordId, landlords.id))
      .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
      .limit(1),
    db
      .select({
        id: tenancies.id,
        status: tenancies.status,
        startDate: tenancies.startDate,
        endDate: tenancies.endDate,
        rentAmount: tenancies.rentAmount,
        rentFrequency: tenancies.rentFrequency,
        depositAmount: tenancies.depositAmount,
        depositProtectedAt: tenancies.depositProtectedAt,
        renterFirstName: renters.firstName,
        renterLastName: renters.lastName,
        renterEmail: renters.email,
        renterPhone: renters.phone,
      })
      .from(tenancies)
      .innerJoin(renters, eq(tenancies.primaryRenterId, renters.id))
      .where(and(eq(tenancies.propertyId, propertyId), agencyEq(tenancies.agencyId)))
      .orderBy(desc(tenancies.startDate))
      .limit(50),
    db
      .select({
        id: tickets.id,
        summary: tickets.summary,
        status: tickets.status,
        priority: tickets.priority,
        isEmergency: tickets.isEmergency,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(and(eq(tickets.propertyId, propertyId), agencyEq(tickets.agencyId)))
      .orderBy(desc(tickets.createdAt))
      .limit(50),
    db
      .select({
        id: inspections.id,
        type: inspections.type,
        scheduledAt: inspections.scheduledAt,
        completedAt: inspections.completedAt,
      })
      .from(inspections)
      .where(and(eq(inspections.propertyId, propertyId), agencyEq(inspections.agencyId)))
      .orderBy(desc(inspections.createdAt))
      .limit(30),
  ]);

  const tenancyList = tenancyRows.map((t) => ({
    ...t,
    renterName: displayPersonName(t.renterFirstName, t.renterLastName),
    rent: Number(t.rentAmount),
    deposit: t.depositAmount == null ? null : Number(t.depositAmount),
    current: ACTIVE.has(t.status),
  }));
  const current = tenancyList.find((t) => t.current) ?? null;
  const overdue = current ? await getOverdueBalance(current.id) : 0;

  const landlord = landlordRows[0]?.landlord ?? null;
  return {
    landlord: landlord
      ? {
          id: landlord.id,
          name: displayPersonName(landlord.firstName, landlord.lastName),
          email: landlord.email,
          phone: landlord.phone,
        }
      : null,
    currentTenancy: current ? { ...current, overdue } : null,
    tenancies: tenancyList,
    openTickets: ticketRows.filter((t) => !CLOSED_TICKET.has(t.status)),
    closedTickets: ticketRows.filter((t) => CLOSED_TICKET.has(t.status)),
    inspections: inspectionRows,
  };
}

export type PropertyOverview = Awaited<ReturnType<typeof getPropertyOverview>>;
