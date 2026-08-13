"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRenterSession } from "@/lib/auth/server";
import { getAppUrl } from "@/lib/app-url";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  getBranchWithSettings,
  getInvoiceForRenter,
  createTicket,
  getActiveTenancyForRenter,
  addTicketMessage,
} from "@/lib/db/queries";
import {
  getStripeAccountId,
  isStripeOnboardingComplete,
} from "@/lib/branch-settings";

async function renterContext() {
  const ctx = await requireRenterSession();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}

export async function createRentCheckoutSession(
  invoiceId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Online payments are not configured." };
  }

  const { profile } = await renterContext();
  const branchId = profile.profile.branchId;
  const renterId = profile.profile.renterId;

  const invoice = await getInvoiceForRenter(invoiceId, branchId, renterId);
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (!invoice.tenancyId) return { ok: false, error: "Invoice not found." };
  if (invoice.status !== "due") return { ok: false, error: "This invoice is not payable." };

  const branch = await getBranchWithSettings(branchId);
  const stripeAccountId = branch ? getStripeAccountId(branch.settings) : null;
  if (!stripeAccountId || !branch || !isStripeOnboardingComplete(branch.settings)) {
    return { ok: false, error: "Your agency has not finished setting up online payments." };
  }

  const amountPence = Math.round(Number(invoice.amount) * 100);
  if (amountPence <= 0) return { ok: false, error: "Invalid invoice amount." };

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: amountPence,
            product_data: {
              name: `${invoice.type} — due ${invoice.dueDate}`,
              description: `Rent payment to ${branch.name}`,
            },
          },
        },
      ],
      metadata: {
        branch_id: branchId,
        invoice_id: invoice.id,
        tenancy_id: invoice.tenancyId,
      },
      success_url: `${appUrl}/portal/rent?paid=1`,
      cancel_url: `${appUrl}/portal/rent/${invoice.id}`,
    },
    { stripeAccount: stripeAccountId }
  );

  if (!session.url) return { ok: false, error: "Could not start checkout." };
  return { ok: true, url: session.url };
}

export async function startRentCheckout(invoiceId: string) {
  const res = await createRentCheckoutSession(invoiceId);
  if (!res.ok) throw new Error(res.error);
  redirect(res.url);
}

export async function addPortalTicketMessage(input: { ticket_id: string; body: string }) {
  const { profile } = await renterContext();
  await addTicketMessage({
    branchId: profile.profile.branchId,
    ticketId: input.ticket_id,
    senderType: "tenant",
    senderId: profile.profile.renterId,
    channel: "portal",
    body: input.body,
  });
  revalidatePath(`/portal/tickets/${input.ticket_id}`);
  revalidatePath("/portal/tickets");
}

export async function createPortalTicket(input: {
  summary: string;
  description?: string;
  location_area?: string | null;
}) {
  const { profile } = await renterContext();
  const branchId = profile.profile.branchId;
  const renterId = profile.profile.renterId;

  const tenancy = await getActiveTenancyForRenter(renterId, branchId);
  if (!tenancy) throw new Error("No active tenancy found for your profile.");

  await createTicket({
    branchId,
    propertyId: tenancy.propertyId,
    tenancyId: tenancy.id,
    reportedByType: "tenant",
    reportedById: renterId,
    source: "portal",
    summary: input.summary,
    description: input.description ?? null,
    locationArea: input.location_area,
  });
  revalidatePath("/portal");
  revalidatePath("/portal/tickets");
}
