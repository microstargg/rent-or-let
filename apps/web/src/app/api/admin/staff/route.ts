import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import { addStaffMember, listStaffInvites, listStaffProfiles } from "@/lib/db/queries";

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
