import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import {
  getPaymentByExternalRef,
  insertPayment,
  getInvoiceById,
  updateBranchSettings,
} from "@/lib/db/queries";
import { parseBranchSettings } from "@/lib/branch-settings";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "payment" || session.payment_status !== "paid") {
      return NextResponse.json({ ok: true, skipped: "not-paid" });
    }

    const branchId = session.metadata?.branch_id;
    const invoiceId = session.metadata?.invoice_id;
    const tenancyId = session.metadata?.tenancy_id;
    if (!branchId || !invoiceId || !tenancyId) {
      return NextResponse.json({ ok: true, skipped: "missing-metadata" });
    }

    const externalRef =
      typeof session.payment_intent === "string" ? session.payment_intent : session.id;

    const existing = await getPaymentByExternalRef(branchId, externalRef);
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice || invoice.status === "paid" || invoice.status === "void") {
      return NextResponse.json({ ok: true, skipped: "invoice-not-due" });
    }

    const amount =
      session.amount_total != null ? session.amount_total / 100 : Number(invoice.amount);

    await insertPayment({
      branchId,
      tenancyId,
      invoiceId,
      amount,
      method: "card",
      externalRef,
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.charges_enabled && account.details_submitted) {
      const { db } = await import("@/lib/db");
      const { branches } = await import("@/lib/db/schema");
      const allBranches = await db.select().from(branches);
      for (const branch of allBranches) {
        const settings = parseBranchSettings(branch.settings);
        if (settings.stripe_account_id === account.id) {
          await updateBranchSettings(branch.id, { stripe_onboarding_complete: true });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
