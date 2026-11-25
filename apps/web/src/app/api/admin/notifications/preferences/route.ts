import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { updateStaffNotificationPrefs } from "@/lib/db/queries/notifications";

const schema = z.object({
  digest: z.enum(["weekdays", "daily", "weekly", "off"]).optional(),
  instantEmail: z.boolean().optional(),
});

/** The signed-in staff member's own email choices. */
export async function PATCH(request: Request) {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  const prefs = await updateStaffNotificationPrefs(session.user.id, parsed.data);
  return NextResponse.json(prefs);
}
