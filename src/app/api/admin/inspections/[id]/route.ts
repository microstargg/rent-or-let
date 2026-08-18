import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  getInspectionById,
  saveInspectionReport,
  createDocument,
} from "@/lib/db/queries";
import { inspectionReportSchema } from "@/lib/inspections/report";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const row = await getInspectionById(id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const branch = await getDefaultBranch();
    if (!branch) return NextResponse.json({ error: "No branch" }, { status: 400 });
    const existing = await getInspectionById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `inspections/${id}/${Date.now()}.${ext}`;
    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, { access: "public" });
      url = blob.url;
    } else {
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const dir = join(process.cwd(), "public", "uploads", "inspections", id);
      await mkdir(dir, { recursive: true });
      const filename = `${Date.now()}.${ext}`;
      await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
      url = `/uploads/inspections/${id}/${filename}`;
    }
    const doc = await createDocument({
      branchId: branch.id,
      entityType: "inspection",
      entityId: id,
      kind: "photo",
      url,
      filename: file.name,
    });
    return NextResponse.json(doc);
  }

  const body = await request.json();
  const report = body.report ? inspectionReportSchema.parse(body.report) : undefined;
  if (!report) return NextResponse.json({ error: "report required" }, { status: 400 });
  const row = await saveInspectionReport(id, {
    report,
    notes: body.notes,
    summary: body.summary,
    complete: Boolean(body.complete),
  });
  return NextResponse.json(row);
}
