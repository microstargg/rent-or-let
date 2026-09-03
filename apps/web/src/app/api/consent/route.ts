import { NextResponse } from "next/server";
import { z } from "zod";
import { insertCookieConsent } from "@/lib/db/queries";

const consentSchema = z.object({
  consent_id: z.string().uuid(),
  preferences: z.object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
  banner_version: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = consentSchema.parse(body);

    if (process.env.DATABASE_URL) {
      await insertCookieConsent({
        consentId: data.consent_id,
        preferences: data.preferences,
        bannerVersion: data.banner_version,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid consent data" }, { status: 400 });
  }
}
