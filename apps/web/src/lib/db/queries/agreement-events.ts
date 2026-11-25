import { db } from "../index";
import { currentAgencyId, ensureAgency } from "../agency-scope";
import { agreementEvents } from "../schema";

/** One line in an agreement's audit trail. */
export async function logAgreementEvent(data: {
  agreementId: string;
  event: string;
  signatureId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  detail?: Record<string, unknown>;
}) {
  await ensureAgency();
  await db.insert(agreementEvents).values({
    agencyId: currentAgencyId(),
    agreementId: data.agreementId,
    signatureId: data.signatureId ?? null,
    event: data.event,
    ip: data.ip ?? null,
    userAgent: data.userAgent?.slice(0, 300) ?? null,
    detail: data.detail ?? {},
  });
}
