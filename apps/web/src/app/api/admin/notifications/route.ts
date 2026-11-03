import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  countUnreadNotifications,
  listNotificationsForStaff,
  markNotificationsRead,
} from "@/lib/db/queries/notifications";

/** The bell: latest notifications for the signed-in staff member. */
export async function GET() {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const staffId = session.user.id;
  const [items, unread] = await Promise.all([
    listNotificationsForStaff(staffId, 30),
    countUnreadNotifications(staffId),
  ]);
  return NextResponse.json(
    { unread, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const markSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
  all: z.boolean().optional(),
});

/** Mark some (ids) or all notifications read. */
export async function PATCH(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const parsed = markSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.all && !parsed.data.ids?.length)) {
    return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });
  }
  await markNotificationsRead(session.user.id, parsed.data.all ? undefined : parsed.data.ids);
  return NextResponse.json({ ok: true });
}
