import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceForRenter } from "@/lib/db/queries";
import { requireRenterSession } from "@/lib/auth/server";
import { PayInvoiceButton } from "@/components/portal/pay-invoice-button";

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

  return (
    <div>
      <Link href="/portal/rent" className="text-sm text-muted-foreground hover:underline">
        ← Rent
      </Link>
      <h1 className="mt-4 text-3xl font-bold capitalize">{invoice.type} invoice</h1>
      <p className="mt-2 text-2xl font-semibold">£{Number(invoice.amount).toFixed(2)}</p>
      <p className="text-muted-foreground">Due {invoice.dueDate} · {invoice.status}</p>
      {invoice.status === "due" && (
        <div className="mt-6">
          <PayInvoiceButton invoiceId={invoice.id} />
        </div>
      )}
    </div>
  );
}
