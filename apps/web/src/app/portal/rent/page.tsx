import Link from "next/link";
import {
  listInvoicesForRenter,
  getTenancyBalance,
  getActiveTenancyForRenter,
  getBranchWithSettings,
} from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { PayInvoiceButton } from "@/components/portal/pay-invoice-button";
import { BankTransferInstructions } from "@/components/portal/bank-transfer-instructions";
import { getClientAccountDetails } from "@/lib/branch-settings";
import { getPaymentRefFromMetadata } from "@/lib/payment-ref";

export default async function PortalRentPage() {
  const ctx = await requireRenterSession();
  if (!ctx) return null;

  const { branchId, renterId } = ctx.profile.profile;
  const rows = await listInvoicesForRenter(branchId, renterId);
  const tenancy = await getActiveTenancyForRenter(renterId, branchId);
  const balance = tenancy ? await getTenancyBalance(tenancy.id) : 0;
  const branch = await getBranchWithSettings(branchId);
  const account = getClientAccountDetails(branch?.settings ?? {});
  const paymentRef = tenancy ? getPaymentRefFromMetadata(tenancy.metadata) : null;
  const openInvoice = rows.find(
    ({ invoice }) => invoice.status === "due" || invoice.status === "partial"
  )?.invoice;

  return (
    <div>
      <h1 className="text-3xl font-bold">Rent</h1>
      <p className="mt-1 text-muted-foreground">Your invoices and payments</p>

      <div className="mt-6 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Current balance</p>
        <p className="text-2xl font-bold">£{balance.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">Positive = amount owed</p>
      </div>

      <div className="mt-6">
        <BankTransferInstructions
          paymentRef={paymentRef}
          accountName={account.name}
          sortCode={account.sortCode}
          accountNumber={account.accountNumber}
          amount={openInvoice ? Number(openInvoice.amount) : balance > 0 ? balance : null}
        />
      </div>

      <div className="mt-8 space-y-3">
        {rows.map(({ invoice }) => (
          <div
            key={invoice.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
          >
            <div>
              <h2 className="font-semibold capitalize">
                {invoice.type} — £{Number(invoice.amount).toFixed(2)}
              </h2>
              <p className="text-sm text-muted-foreground">
                Due {invoice.dueDate} · {invoice.status}
              </p>
            </div>
            {(invoice.status === "due" || invoice.status === "partial") && (
              <PayInvoiceButton invoiceId={invoice.id} />
            )}
            {(invoice.status === "due" || invoice.status === "partial") && (
              <Link
                href={`/portal/rent/${invoice.id}`}
                className="text-sm text-muted-foreground underline"
              >
                Details
              </Link>
            )}
          </div>
        ))}
        {!rows.length && <p className="text-muted-foreground">No invoices</p>}
      </div>
    </div>
  );
}
