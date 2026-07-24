import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getInvoiceForRenter,
  getActiveTenancyForRenter,
  getBranchWithSettings,
} from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { PayInvoiceButton } from "@/components/portal/pay-invoice-button";
import { BankTransferInstructions } from "@/components/portal/bank-transfer-instructions";
import { getClientAccountDetails } from "@/lib/branch-settings";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";

export default async function PortalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { invoiceId } = await params;
  const { branchId, renterId } = ctx.profile.profile;
  const invoice = await getInvoiceForRenter(invoiceId, branchId, renterId);
  if (!invoice) notFound();

  const tenancy = await getActiveTenancyForRenter(renterId, branchId);
  const branch = await getBranchWithSettings(branchId);
  const account = getClientAccountDetails(branch?.settings ?? {});
  const paymentRef = tenancy ? getPaymentRefFromMetadata(tenancy.metadata) : null;

  return (
    <div>
      <Link href="/portal/rent" className="text-sm text-muted-foreground hover:underline">
        ← Rent
      </Link>
      <h1 className="mt-4 text-3xl font-bold capitalize">{invoice.type} invoice</h1>
      <p className="mt-2 text-2xl font-semibold">£{Number(invoice.amount).toFixed(2)}</p>
      <p className="text-muted-foreground">
        Due {invoice.dueDate} · {invoice.status}
      </p>

      {(invoice.status === "due" || invoice.status === "partial") && (
        <div className="mt-6 space-y-4">
          <BankTransferInstructions
            paymentRef={paymentRef}
            accountName={account.name}
            sortCode={account.sortCode}
            accountNumber={account.accountNumber}
            amount={Number(invoice.amount)}
          />
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Or pay by card if enabled:</p>
            <PayInvoiceButton invoiceId={invoice.id} />
          </div>
        </div>
      )}
    </div>
  );
}
