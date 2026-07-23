import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireAdminApi } from "@/lib/api-auth";
import {
  getDefaultBranch,
  getBranchWithSettings,
  updateBranchSettings,
  createRenterInvite,
  getRenterById,
  createStaffInvite,
  getStaffProfileByEmail,
  listStaffProfiles,
  listPendingStaffInvites,
} from "@/lib/db/queries";
import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { sendPortalInviteEmail } from "@/lib/email/resend";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const full = await getBranchWithSettings(branch.id);
  const inboundDomain = process.env.RESEND_INBOUND_DOMAIN ?? "";
  const token = full?.settings.maintenance_inbox_token;
  const staff = await listStaffProfiles();
  const pendingInvites = await listPendingStaffInvites();

  return NextResponse.json({
    branch: full,
    maintenance_inbox: token && inboundDomain ? `maintenance+${token}@${inboundDomain}` : null,
    stripe_configured: isStripeConfigured(),
    staff,
    pending_staff_invites: pendingInvites,
  });
}

const patchSchema = z.object({
  maintenance_inbox_token: z.string().optional(),
  alert_email: z.string().email().optional().nullable(),
  stripe_onboarding_complete: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const body = patchSchema.parse(await request.json());
  const current = await getBranchWithSettings(branch.id);
  const settings = {
    ...(current?.settings ?? {}),
    ...(body.maintenance_inbox_token !== undefined && {
      maintenance_inbox_token: body.maintenance_inbox_token || undefined,
    }),
    ...(body.alert_email !== undefined && { alert_email: body.alert_email ?? undefined }),
    ...(body.stripe_onboarding_complete !== undefined && {
      stripe_onboarding_complete: body.stripe_onboarding_complete,
    }),
  };

  if (!settings.maintenance_inbox_token) {
    settings.maintenance_inbox_token = randomUUID();
  }

  const merged = await updateBranchSettings(branch.id, settings);
  return NextResponse.json({ settings: merged });
}

const inviteSchema = z.object({
  renter_id: z.string().uuid(),
  email: z.string().email(),
});

const staffInviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["staff", "admin"]).optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const branch = await getDefaultBranch();
  if (!branch) {
    return NextResponse.json({ error: "No branch configured" }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "stripe_connect") {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
    }
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const account = await stripe.accounts.create({ type: "express", country: "GB" });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appUrl}/admin/settings?stripe=refresh`,
      return_url: `${appUrl}/admin/settings?stripe=return`,
      type: "account_onboarding",
    });
    await updateBranchSettings(branch.id, { stripe_account_id: account.id });
    return NextResponse.json({ url: link.url });
  }

  if (action === "renter_invite") {
    const body = inviteSchema.parse(await request.json());
    const renter = await getRenterById(body.renter_id);
    if (!renter) {
      return NextResponse.json({ error: "Renter not found" }, { status: 404 });
    }
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await createRenterInvite({
      branchId: branch.id,
      renterId: body.renter_id,
      email: body.email,
      token,
      expiresAt,
    });
    const inviteUrl = `${getAppUrl()}/accept-invite?token=${token}`;
    const emailResult = await sendPortalInviteEmail({
      to: body.email,
      inviteUrl,
      role: "renter",
    });
    return NextResponse.json({
      invite_url: inviteUrl,
      email_sent: emailResult.sent,
      email_reason: emailResult.reason ?? null,
    });
  }

  if (action === "staff_invite") {
    const body = staffInviteSchema.parse(await request.json());
    const existing = await getStaffProfileByEmail(body.email);
    if (existing) {
      return NextResponse.json({ error: "Staff member already exists" }, { status: 400 });
    }
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invite = await createStaffInvite({
      email: body.email,
      fullName: body.full_name,
      role: body.role ?? "staff",
      token,
      expiresAt,
    });
    const inviteUrl = `${getAppUrl()}/accept-staff-invite?token=${token}`;
    const emailResult = await sendPortalInviteEmail({
      to: body.email,
      inviteUrl,
      role: "staff",
    });
    return NextResponse.json({
      invite,
      invite_url: inviteUrl,
      email_sent: emailResult.sent,
      email_reason: emailResult.reason ?? null,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
