import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { getDefaultBranch } from "@/lib/db/queries";
import { createBoardTask, listBoardTasks } from "@/lib/db/queries/notifications";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
  due_at: z.string().optional().nullable(),
  assignee_staff_id: z.string().optional().nullable(),
  related_type: z.enum(["property", "ticket", "tenancy"]).optional().nullable(),
  related_id: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json([]);
  return NextResponse.json(await listBoardTasks(branch.id));
}

export async function POST(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const branch = await getDefaultBranch();
  if (!branch) return NextResponse.json({ error: "No branch configured" }, { status: 400 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the task a title" }, { status: 400 });
  }
  const body = parsed.data;
  const row = await createBoardTask(
    {
      branchId: branch.id,
      title: body.title,
      notes: body.notes || null,
      dueAt: body.due_at ? new Date(body.due_at) : null,
      assigneeStaffId: body.assignee_staff_id || null,
      relatedType: body.related_id ? body.related_type ?? null : null,
      relatedId: body.related_type ? body.related_id ?? null : null,
    },
    session.user.id
  );
  return NextResponse.json(row);
}
