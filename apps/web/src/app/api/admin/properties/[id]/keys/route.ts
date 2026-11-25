import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/api-validation";
import { addPropertyKey, moveKey, removePropertyKey } from "@/lib/db/queries/keys";
import { actorOf, logActivity } from "@/lib/db/queries/activity";
import { KEY_HOLDERS, describeHolder } from "@/lib/operations/keys";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    label: z.string().trim().min(1).max(80),
    key_count: z.number().int().min(1).max(50).default(1),
    notes: z.string().max(500).optional().nullable(),
  }),
  z.object({
    action: z.literal("move"),
    key_id: z.string().uuid(),
    holder_type: z.enum(KEY_HOLDERS),
    holder_name: z.string().trim().max(120).optional().nullable(),
    due_back: isoDate.optional().nullable(),
  }),
  z.object({ action: z.literal("remove"), key_id: z.string().uuid() }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const actor = actorOf(session);
  const log = (keyId: string, action: string, summary: string) =>
    logActivity(actor, { entityType: "key", entityId: keyId, propertyId: id, action, summary });

  if (body.action === "add") {
    const row = await addPropertyKey(id, { label: body.label, keyCount: body.key_count, notes: body.notes });
    if (!row) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    await log(row.id, "key_added", `Added keys: ${row.label} (${row.keyCount})`);
    return NextResponse.json(row, { status: 201 });
  }
  if (body.action === "move") {
    if (body.holder_type !== "office" && !body.holder_name?.trim()) {
      return NextResponse.json({ error: "Say who has the keys" }, { status: 400 });
    }
    const row = await moveKey(id, body.key_id, {
      holderType: body.holder_type,
      holderName: body.holder_name,
      dueBack: body.due_back,
    });
    if (!row) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    await log(
      row.id,
      body.holder_type === "office" ? "key_returned" : "key_out",
      body.holder_type === "office"
        ? `${row.label} back in the office`
        : `${row.label} given to ${describeHolder(row)}${row.dueBack ? `, due back ${new Date(`${row.dueBack}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` : ""}`
    );
    return NextResponse.json(row);
  }
  const row = await removePropertyKey(id, body.key_id);
  if (!row) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  await log(row.id, "key_removed", `Removed keys: ${row.label}`);
  return NextResponse.json({ ok: true });
}
