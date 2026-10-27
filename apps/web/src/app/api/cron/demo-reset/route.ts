import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api-auth";
import { resetDemoData } from "@/lib/demo/reset";

export const maxDuration = 60;

/** Nightly: wipe the demo agency's own database and load fresh fake data dated to today. */
export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resetDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Demo reset failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
