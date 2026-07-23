import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  getLandlordInviteByToken,
  acceptLandlordInvite,
  createLandlordProfile,
  getLandlordProfileByUserId,
} from "@/lib/db/queries";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const invite = await getLandlordInviteByToken(body.token);
  if (!invite) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
  }

  const existing = await getLandlordProfileByUserId(userId);
  if (!existing) {
    await createLandlordProfile({
      userId,
      branchId: invite.branchId,
      landlordId: invite.landlordId,
      email,
    });
  }
  await acceptLandlordInvite(invite.id);
  return NextResponse.json({ ok: true });
}
