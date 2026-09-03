import { NextResponse } from "next/server";
import {
  getLandlordInviteByToken,
  acceptLandlordInvite,
  createLandlordProfile,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
    user_id?: string;
    email?: string;
  };
  if (!body.token || !body.user_id || !body.email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const invite = await getLandlordInviteByToken(body.token);
  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  if (invite.email.toLowerCase() !== body.email.toLowerCase()) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
  }

  await createLandlordProfile({
    userId: body.user_id,
    branchId: invite.branchId,
    landlordId: invite.landlordId,
    email: body.email,
  });
  await acceptLandlordInvite(invite.id);
  return NextResponse.json({ ok: true });
}
