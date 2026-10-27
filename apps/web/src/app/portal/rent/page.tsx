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
import { AdminEmptyState, AdminPageHeader, StatusBadge } from "@/components/admin/admin-page";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/portal-format";

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
      <AdminPageHeader title="Rent" description="Your invoices and payments" />

      <div className="mt-6 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Current balance</p>
        <p className="text-2xl font-bold">{formatMoney(balance)}</p>
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
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4"
          >
            <div>
              <h2 className="font-semibold capitalize">
                {invoice.type.replaceAll("_", " ")} — {formatMoney(invoice.amount)}
              </h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Due {formatDate(invoice.dueDate)}
                <StatusBadge status={invoice.status} />
              </p>
            </div>
            {(invoice.status === "due" || invoice.status === "partial") && (
              <div className="flex items-center gap-4">
                <Link
                  href={`/portal/rent/${invoice.id}`}
                  className="text-sm text-muted-foreground underline"
                >
                  Details
                </Link>
                <PayInvoiceButton invoiceId={invoice.id} />
              </div>
            )}
          </div>
        ))}
        {!rows.length && <AdminEmptyState title="No invoices yet" />}
      </div>
    </div>
  );
}
