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
  backfillPaymentRefsForBranch,
} from "@/lib/db/queries";
import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  buildTrueLayerAuthUrl,
  isTrueLayerConfigured,
} from "@/lib/truelayer/client";
import { createBankConnection, listBankConnections } from "@/lib/db/queries/bank-feed";

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

  const bankConnections = await listBankConnections(branch.id);

  return NextResponse.json({
    branch: full,
    maintenance_inbox: token && inboundDomain ? `maintenance+${token}@${inboundDomain}` : null,
    stripe_configured: isStripeConfigured(),
    truelayer_configured: isTrueLayerConfigured(),
    bank_connections: bankConnections.map((c) => ({
      id: c.id,
      status: c.status,
      accountName: c.accountName,
      accountNumberMask: c.accountNumberMask,
      consentExpiresAt: c.consentExpiresAt,
      lastSyncedAt: c.lastSyncedAt,
    })),
  });
}

const patchSchema = z.object({
  maintenance_inbox_token: z.string().optional(),
  alert_email: z.string().email().optional().nullable(),
  stripe_onboarding_complete: z.boolean().optional(),
  client_account_name: z.string().max(120).optional().nullable(),
  client_account_sort_code: z.string().max(20).optional().nullable(),
  client_account_number: z.string().max(20).optional().nullable(),
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
    ...(body.client_account_name !== undefined && {
      client_account_name: body.client_account_name || undefined,
    }),
    ...(body.client_account_sort_code !== undefined && {
      client_account_sort_code: body.client_account_sort_code || undefined,
    }),
    ...(body.client_account_number !== undefined && {
      client_account_number: body.client_account_number || undefined,
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

  if (action === "bank_feed_connect") {
    if (!isTrueLayerConfigured()) {
      return NextResponse.json({ error: "TrueLayer not configured" }, { status: 400 });
    }
    const connection = await createBankConnection({
      branchId: branch.id,
      status: "pending",
      meta: { startedAt: new Date().toISOString() },
    });
    const url = buildTrueLayerAuthUrl(connection.id);
    return NextResponse.json({ url, connectionId: connection.id });
  }

  if (action === "backfill_payment_refs") {
    const updated = await backfillPaymentRefsForBranch(branch.id);
    return NextResponse.json({ ok: true, updated });
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
    return NextResponse.json({ invite_url: inviteUrl });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
