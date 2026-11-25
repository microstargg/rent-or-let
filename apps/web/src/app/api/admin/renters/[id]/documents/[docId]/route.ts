import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { getRenterDocument, removeRenterDocument, RENTER_DOCUMENT_KINDS } from "@/lib/db/queries/renter-documents";
import { privateFileResponse, readPrivateFile } from "@/lib/storage/private-files";

type Params = { params: Promise<{ id: string; docId: string }> };

/** Staff only. Every view is logged, because these are identity documents. */
export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id, docId } = await params;
  const doc = await getRenterDocument(docId);
  if (!doc || doc.renterId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await readPrivateFile(doc.storageKey);
  if (!file) return NextResponse.json({ error: "The file is missing from storage" }, { status: 404 });
  await logActivity(actorOf(session), {
    entityType: "renter",
    entityId: id,
    branchId: doc.branchId,
    action: "renter_document_viewed",
    summary: `${RENTER_DOCUMENT_KINDS[doc.kind] ?? "Document"} opened`,
    meta: { documentId: doc.id },
  });
  return privateFileResponse(file, doc.filename);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id, docId } = await params;
  const doc = await getRenterDocument(docId);
  if (!doc || doc.renterId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await removeRenterDocument(docId);
  await logActivity(actorOf(session), {
    entityType: "renter",
    entityId: id,
    branchId: doc.branchId,
    action: "renter_document_deleted",
    summary: `${RENTER_DOCUMENT_KINDS[doc.kind] ?? "Document"} deleted (${doc.filename})`,
  });
  return NextResponse.json({ ok: true });
}
