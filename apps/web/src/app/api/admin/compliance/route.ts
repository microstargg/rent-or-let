import { NextResponse } from "next/server";
import { z } from "zod";
import { put } from "@vercel/blob";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  createComplianceItem,
  updateComplianceItem,
  listComplianceItems,
  markComplianceServed,
  refreshComplianceStatuses,
  createDocument,
} from "@/lib/db/queries";

const createSchema = z.object({
  property_id: z.string().uuid(),
  tenancy_id: z.string().uuid().optional().nullable(),
  type: z.string(),
  issued_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
  const rows = await listComplianceItems(branch.id);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const propertyId = String(form.get("property_id") ?? "");
    const type = String(form.get("type") ?? "other");
    const expiresAt = form.get("expires_at") ? String(form.get("expires_at")) : null;
    const issuedAt = form.get("issued_at") ? String(form.get("issued_at")) : null;
    const reference = form.get("reference") ? String(form.get("reference")) : null;
    const tenancyId = form.get("tenancy_id") ? String(form.get("tenancy_id")) : null;
    const file = form.get("file") as File | null;

    if (!propertyId || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let documentId: string | null = null;
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() ?? "pdf";
      const pathname = `compliance/${propertyId}/${Date.now()}.${ext}`;
      let url: string;
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(pathname, file, { access: "public" });
        url = blob.url;
      } else {
        const { writeFile, mkdir } = await import("fs/promises");
        const { join } = await import("path");
        const dir = join(process.cwd(), "public", "uploads", "compliance", propertyId);
        await mkdir(dir, { recursive: true });
        const filename = `${Date.now()}.${ext}`;
        await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
        url = `/uploads/compliance/${propertyId}/${filename}`;
      }
      const doc = await createDocument({
        branchId: branch.id,
        entityType: "property",
        entityId: propertyId,
        kind: type,
        url,
        filename: file.name,
      });
      documentId = doc.id;
    }

    const item = await createComplianceItem({
      branchId: branch.id,
      propertyId,
      tenancyId,
      type,
      issuedAt,
      expiresAt,
      reference,
      documentId,
    });
    return NextResponse.json(item, { status: 201 });
  }

  const body = createSchema.parse(await request.json());
  const item = await createComplianceItem({
    branchId: branch.id,
    propertyId: body.property_id,
    tenancyId: body.tenancy_id,
    type: body.type,
    issuedAt: body.issued_at,
    expiresAt: body.expires_at,
    reference: body.reference,
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });

  const body = (await request.json()) as {
    action?: string;
    id?: string;
    served_channel?: string;
    served_to?: string;
    expires_at?: string | null;
    issued_at?: string | null;
    reference?: string | null;
  };

  if (body.action === "refresh") {
    const result = await refreshComplianceStatuses(branch.id);
    return NextResponse.json(result);
  }

  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (body.action === "mark_served") {
    const result = await markComplianceServed(body.id, {
      servedChannel: body.served_channel ?? "hand",
      servedTo: body.served_to,
    });
    return NextResponse.json(result);
  }

  const row = await updateComplianceItem(body.id, {
    expiresAt: body.expires_at,
    issuedAt: body.issued_at,
    reference: body.reference,
  });
  return NextResponse.json(row);
}
