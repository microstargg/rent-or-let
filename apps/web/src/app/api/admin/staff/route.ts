import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  addStaffMember,
  getStaffProfileById,
  listStaffInvites,
  listStaffProfiles,
  removeStaffInvite,
  removeStaffMember,
  updateStaffRole,
} from "@/lib/db/queries";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const [staff, invites] = await Promise.all([listStaffProfiles(), listStaffInvites()]);
  return NextResponse.json({ staff, invites });
}

const postSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: z.enum(["admin", "staff"]).optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and a valid email are required" }, { status: 400 });
  }
  const result = await addStaffMember(parsed.data);
  return NextResponse.json(result);
}

/** Only admins can change roles or remove people. */
async function requireTeamAdmin() {
  const { session, error } = await requireAdminApi();
  if (error) return { me: null, error };
  const me = session?.user?.id ? await getStaffProfileById(session.user.id) : null;
  if (me?.role !== "admin") {
    return { me: null, error: NextResponse.json({ error: "Only admins can change the team" }, { status: 403 }) };
  }
  return { me, error: null };
}

const patchSchema = z.object({ id: z.string().min(1), role: z.enum(["admin", "staff"]) });

export async function PATCH(request: Request) {
  const { me, error } = await requireTeamAdmin();
  if (error) return error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a role" }, { status: 400 });
  const { id, role } = parsed.data;
  if (role === "staff") {
    const admins = (await listStaffProfiles()).filter((s) => s.role === "admin");
    if (admins.length <= 1 && admins[0]?.id === id) {
      return NextResponse.json({ error: "There must be at least one admin" }, { status: 400 });
    }
  }
  if (id === me!.id && role === "staff") {
    return NextResponse.json({ error: "Ask another admin to change your own role" }, { status: 400 });
  }
  const row = await updateStaffRole(id, role);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

const deleteSchema = z.object({ id: z.string().min(1), kind: z.enum(["staff", "invite"]) });

export async function DELETE(request: Request) {
  const { me, error } = await requireTeamAdmin();
  if (error) return error;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to remove" }, { status: 400 });
  const { id, kind } = parsed.data;
  if (kind === "invite") {
    await removeStaffInvite(id);
    return NextResponse.json({ success: true });
  }
  if (id === me!.id) return NextResponse.json({ error: "You can't remove yourself" }, { status: 400 });
  await removeStaffMember(id);
  return NextResponse.json({ success: true });
}
