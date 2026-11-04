import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-validation";
import { signAgreement } from "@/lib/db/queries/tenancy";

const schema = z.object({
  signed_name: z.string().trim().min(2).max(120),
  agree: z.literal(true),
});

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = await parseJsonBody(request, schema);
  if (parsed.error) return parsed.error;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const result = await signAgreement(token, {
    signedName: parsed.data.signed_name,
    ip,
    userAgent: request.headers.get("user-agent"),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
