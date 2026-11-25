import { and, asc, count, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "../index";
import { agencyEq, ensureAgency } from "../agency-scope";
import { agreementEvents, agreementSignatures, tenancyAgreements } from "../schema";
import { logAgreementEvent } from "./agreement-events";
import { createDocument } from "./compliance";
import { getAgreementWithSignatures, getSignatureByToken } from "./tenancy";
import {
  hashSigningCode,
  newSigningCode,
  renderAgreementPdf,
  SIGNING_CODE,
  signingCodeMatches,
  type AgreementEventLine,
  type AgreementTerms,
} from "@/lib/tenancy/agreement";
import { savePrivateFile } from "@/lib/storage/private-files";

export interface RequestInfo {
  ip: string | null;
  userAgent: string | null;
}

/** Events for one or more agreements, oldest first, with the signer's name. */
export async function listAgreementEvents(agreementIds: string[]) {
  await ensureAgency();
  if (!agreementIds.length) return [];
  return db
    .select({
      id: agreementEvents.id,
      agreementId: agreementEvents.agreementId,
      event: agreementEvents.event,
      ip: agreementEvents.ip,
      detail: agreementEvents.detail,
      createdAt: agreementEvents.createdAt,
      who: agreementSignatures.fullName,
    })
    .from(agreementEvents)
    .leftJoin(agreementSignatures, eq(agreementEvents.signatureId, agreementSignatures.id))
    .where(and(inArray(agreementEvents.agreementId, agreementIds), agencyEq(agreementEvents.agencyId)))
    .orderBy(asc(agreementEvents.createdAt));
}

export function toEventLines(rows: Awaited<ReturnType<typeof listAgreementEvents>>): AgreementEventLine[] {
  return rows.map((e) => ({
    event: e.event,
    who: e.who ?? (typeof e.detail === "object" && e.detail && "who" in e.detail ? String((e.detail as { who: unknown }).who) : null),
    ip: e.ip,
    at: e.createdAt,
    detail: e.detail as Record<string, unknown>,
  }));
}

/** Log that a signer opened their link, at most once every 30 minutes. */
export async function recordAgreementView(token: string, req: RequestInfo) {
  const found = await getSignatureByToken(token);
  if (!found || found.agreement.status === "cancelled") return;
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(agreementEvents)
    .where(
      and(
        eq(agreementEvents.signatureId, found.signature.id),
        eq(agreementEvents.event, "viewed"),
        gt(agreementEvents.createdAt, since),
        agencyEq(agreementEvents.agencyId)
      )
    );
  if (Number(recent?.n ?? 0) > 0) return;
  await logAgreementEvent({
    agreementId: found.agreement.id,
    signatureId: found.signature.id,
    event: "viewed",
    ...req,
  });
}

/**
 * Make a fresh one-time code for a signer. Returns the code so the caller can
 * email it; only its hash is stored.
 */
export async function issueSigningCode(
  token: string,
  req: RequestInfo
): Promise<{ error: string; status: number } | { code: string; email: string; fullName: string; signatureId: string; agreementId: string }> {
  const found = await getSignatureByToken(token);
  if (!found) return { error: "This signing link isn't valid.", status: 404 };
  if (found.agreement.status === "cancelled") {
    return { error: "This agreement was replaced. Ask the agent for a new link.", status: 410 };
  }
  const sig = found.signature;
  if (sig.signedAt) return { error: "Already signed.", status: 409 };
  if (!sig.email) return { error: "There's no email address for you, so no code is needed.", status: 400 };
  if (sig.otpSentAt && Date.now() - sig.otpSentAt.getTime() < SIGNING_CODE.resendSeconds * 1000) {
    return { error: "A code was sent less than a minute ago. Check your inbox and spam folder.", status: 429 };
  }
  const [sent] = await db
    .select({ n: count() })
    .from(agreementEvents)
    .where(
      and(
        eq(agreementEvents.signatureId, sig.id),
        eq(agreementEvents.event, "code_sent"),
        agencyEq(agreementEvents.agencyId)
      )
    );
  if (Number(sent?.n ?? 0) >= SIGNING_CODE.maxSends) {
    return { error: "Too many codes have been sent. Ask your letting agent for a new link.", status: 429 };
  }

  const code = newSigningCode();
  await db
    .update(agreementSignatures)
    .set({
      otpHash: hashSigningCode(code, sig.id),
      otpExpiresAt: new Date(Date.now() + SIGNING_CODE.ttlMinutes * 60 * 1000),
      otpAttempts: 0,
      otpSentAt: new Date(),
    })
    .where(and(eq(agreementSignatures.id, sig.id), agencyEq(agreementSignatures.agencyId)));
  await logAgreementEvent({ agreementId: found.agreement.id, signatureId: sig.id, event: "code_sent", ...req });
  return { code, email: sig.email, fullName: sig.fullName, signatureId: sig.id, agreementId: found.agreement.id };
}

export interface CompletedAgreement {
  agreementId: string;
  tenancyId: string;
  pdf: Uint8Array;
  pdfSha256: string;
  recipients: { name: string; email: string; signatureId: string }[];
}

/**
 * Sign with a personal link. A signer with an email address must enter the code
 * sent to it. When the last person signs, the PDF with its audit trail is frozen
 * in private storage and returned so the caller can email everyone a copy.
 */
export async function signAgreement(
  token: string,
  data: { signedName: string; code?: string | null } & RequestInfo
): Promise<{ error: string; status?: number } | { completed: false } | ({ completed: true } & CompletedAgreement)> {
  const found = await getSignatureByToken(token);
  if (!found) return { error: "This signing link isn't valid." };
  if (found.agreement.status === "cancelled") return { error: "This agreement was replaced. Ask the agent for a new link." };
  const sig = found.signature;
  if (sig.signedAt) return { error: "Already signed." };

  let verifiedBy: "email_code" | "link_only" = "link_only";
  if (sig.email) {
    if (!data.code) return { error: "Enter the code we emailed you." };
    if (!sig.otpHash || !sig.otpExpiresAt) return { error: "Ask for a code first." };
    if (sig.otpAttempts >= SIGNING_CODE.maxAttempts) {
      return { error: "Too many wrong codes. Ask for a new code.", status: 429 };
    }
    if (sig.otpExpiresAt.getTime() < Date.now()) return { error: "That code has expired. Ask for a new one." };
    if (!signingCodeMatches(data.code, sig.id, sig.otpHash)) {
      await db
        .update(agreementSignatures)
        .set({ otpAttempts: sig.otpAttempts + 1 })
        .where(and(eq(agreementSignatures.id, sig.id), agencyEq(agreementSignatures.agencyId)));
      await logAgreementEvent({
        agreementId: found.agreement.id,
        signatureId: sig.id,
        event: "code_failed",
        ip: data.ip,
        userAgent: data.userAgent,
      });
      return { error: "That code isn't right. Check the latest email we sent." };
    }
    verifiedBy = "email_code";
  }

  const updated = await db
    .update(agreementSignatures)
    .set({
      signedName: data.signedName,
      signedAt: new Date(),
      signedIp: data.ip,
      signedUserAgent: data.userAgent?.slice(0, 300) ?? null,
      verifiedBy,
      otpHash: null,
    })
    .where(and(eq(agreementSignatures.id, sig.id), isNull(agreementSignatures.signedAt)))
    .returning({ id: agreementSignatures.id });
  if (!updated.length) return { error: "Already signed." };
  await logAgreementEvent({
    agreementId: found.agreement.id,
    signatureId: sig.id,
    event: "signed",
    ip: data.ip,
    userAgent: data.userAgent,
    detail: { verifiedBy, signedName: data.signedName },
  });

  // Count from the database, so two people signing at once can't both miss completion.
  const [left] = await db
    .select({ n: count() })
    .from(agreementSignatures)
    .where(and(eq(agreementSignatures.agreementId, found.agreement.id), isNull(agreementSignatures.signedAt)));
  if (Number(left?.n ?? 0) > 0) return { completed: false };

  // Only one request may complete the agreement.
  const claimed = await db
    .update(tenancyAgreements)
    .set({ status: "signed", completedAt: new Date() })
    .where(
      and(
        eq(tenancyAgreements.id, found.agreement.id),
        eq(tenancyAgreements.status, "sent"),
        agencyEq(tenancyAgreements.agencyId)
      )
    )
    .returning({ id: tenancyAgreements.id });
  if (!claimed.length) return { completed: false };

  await logAgreementEvent({ agreementId: found.agreement.id, event: "completed", ip: data.ip, userAgent: data.userAgent });
  const completed = await freezeSignedAgreement(found.agreement.id);
  if (!completed) return { completed: false };
  return { completed: true, ...completed };
}

/** Render the final PDF with the audit trail, store it privately and link it to the tenancy. */
async function freezeSignedAgreement(agreementId: string): Promise<CompletedAgreement | null> {
  const data = await getAgreementWithSignatures(agreementId);
  if (!data) return null;
  const events = toEventLines(await listAgreementEvents([agreementId]));
  const pdf = renderAgreementPdf(data.agreement.terms as AgreementTerms, {
    hash: data.agreement.termsHash,
    signatures: data.signatures,
    events,
  });
  const saved = await savePrivateFile({
    pathname: `agreements/${data.agreement.tenancyId}/${agreementId}.pdf`,
    bytes: pdf,
    contentType: "application/pdf",
  });
  const doc = await createDocument({
    branchId: data.agreement.branchId,
    entityType: "tenancy",
    entityId: data.agreement.tenancyId,
    kind: "tenancy_agreement",
    url: `/api/agreements/${agreementId}/pdf`,
    filename: "tenancy-agreement.pdf",
    meta: { termsHash: data.agreement.termsHash, pdfSha256: saved.sha256 },
  });
  await db
    .update(tenancyAgreements)
    .set({ documentId: doc.id, signedPdfKey: saved.key, signedPdfSha256: saved.sha256 })
    .where(and(eq(tenancyAgreements.id, agreementId), agencyEq(tenancyAgreements.agencyId)));

  return {
    agreementId,
    tenancyId: data.agreement.tenancyId,
    pdf,
    pdfSha256: saved.sha256,
    recipients: data.signatures
      .filter((s) => s.email)
      .map((s) => ({ name: s.fullName, email: s.email!, signatureId: s.id })),
  };
}
