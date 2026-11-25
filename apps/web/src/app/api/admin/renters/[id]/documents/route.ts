import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-auth";
import { getRenterById } from "@/lib/db/queries";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { addRenterDocument, RENTER_DOCUMENT_KINDS } from "@/lib/db/queries/renter-documents";
import { PRIVATE_FILE_MAX_BYTES, PRIVATE_FILE_TYPES, savePrivateFile, sniffDocumentType } from "@/lib/storage/private-files";

/** Upload a document to a renter's profile. Files go to private storage only. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const renter = await getRenterById(id);
  if (!renter) return NextResponse.json({ error: "Renter not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "other");
  const label = String(form?.get("label") ?? "").trim().slice(0, 120) || null;
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  }
  if (!RENTER_DOCUMENT_KINDS[kind]) return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  if (file.size > PRIVATE_FILE_MAX_BYTES) {
    return NextResponse.json({ error: "Files must be under 4 MB. Try a lower-resolution scan or photo." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = sniffDocumentType(bytes);
  if (!contentType) {
    return NextResponse.json({ error: "Upload a PDF or a photo (JPG, PNG, HEIC or WebP)." }, { status: 415 });
  }

  const saved = await savePrivateFile({
    pathname: `renters/${renter.id}/${kind}-${Date.now()}.${PRIVATE_FILE_TYPES[contentType]}`,
    bytes,
    contentType,
  });
  const actor = actorOf(session);
  const doc = await addRenterDocument({
    branchId: renter.branchId,
    renterId: renter.id,
    kind,
    label,
    storageKey: saved.key,
    filename: file.name.slice(0, 200) || `document.${PRIVATE_FILE_TYPES[contentType]}`,
    contentType,
    sizeBytes: saved.size,
    sha256: saved.sha256,
    uploadedBy: actor?.name ?? null,
  });
  await logActivity(actor, {
    entityType: "renter",
    entityId: renter.id,
    branchId: renter.branchId,
    action: "renter_document_added",
    summary: `${RENTER_DOCUMENT_KINDS[kind]} uploaded${label ? ` (${label})` : ""}`,
    meta: { documentId: doc.id },
  });
  const { storageKey: _key, ...safe } = doc;
  return NextResponse.json(safe, { status: 201 });
}
