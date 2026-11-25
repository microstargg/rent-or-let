import { and, asc, eq } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, currentAgencyId, ensureAgency } from "../agency-scope";
import { properties, propertyKeys } from "../schema";

import type { KeyHolder } from "@/lib/operations/keys";

export async function listPropertyKeys(propertyId: string) {
  await ensureAgency();
  return db
    .select()
    .from(propertyKeys)
    .where(and(eq(propertyKeys.propertyId, propertyId), agencyEq(propertyKeys.agencyId)))
    .orderBy(asc(propertyKeys.createdAt));
}

export async function addPropertyKey(
  propertyId: string,
  data: { label: string; keyCount: number; notes?: string | null }
) {
  await ensureAgency();
  const [property] = await db
    .select({ branchId: properties.branchId })
    .from(properties)
    .where(and(eq(properties.id, propertyId), agencyEq(properties.agencyId)))
    .limit(1);
  if (!property) return null;
  const [row] = await db
    .insert(propertyKeys)
    .values({
      agencyId: currentAgencyId(),
      branchId: property.branchId,
      propertyId,
      label: data.label,
      keyCount: data.keyCount,
      notes: data.notes ?? null,
    })
    .returning();
  return row ?? null;
}

/** Hand keys to someone, or back to the office (holder "office" clears the dates). */
export async function moveKey(
  propertyId: string,
  keyId: string,
  data: { holderType: KeyHolder; holderName?: string | null; dueBack?: string | null; notes?: string | null }
) {
  await ensureAgency();
  const inOffice = data.holderType === "office";
  const [row] = await db
    .update(propertyKeys)
    .set({
      holderType: data.holderType,
      holderName: inOffice ? null : (data.holderName ?? null),
      outSince: inOffice ? null : new Date().toISOString().slice(0, 10),
      dueBack: inOffice ? null : (data.dueBack ?? null),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(propertyKeys.id, keyId), eq(propertyKeys.propertyId, propertyId), agencyEq(propertyKeys.agencyId))
    )
    .returning();
  return row ?? null;
}

export async function removePropertyKey(propertyId: string, keyId: string) {
  await ensureAgency();
  const [row] = await db
    .delete(propertyKeys)
    .where(
      and(eq(propertyKeys.id, keyId), eq(propertyKeys.propertyId, propertyId), agencyEq(propertyKeys.agencyId))
    )
    .returning();
  return row ?? null;
}
