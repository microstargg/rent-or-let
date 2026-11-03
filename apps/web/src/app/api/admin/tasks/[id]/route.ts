import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updateBoardTask } from "@/lib/db/queries/notifications";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  due_at: z.string().optional().nullable(),
  status: z.enum(["open", "done"]).optional(),
  assignee_staff_id: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  const body = parsed.data;

  const row = await updateBoardTask(
    id,
    {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.due_at !== undefined && { dueAt: body.due_at ? new Date(body.due_at) : null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.assignee_staff_id !== undefined && { assigneeStaffId: body.assignee_staff_id || null }),
    },
    session.user.id
  );
  if (!row) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(row);
}
