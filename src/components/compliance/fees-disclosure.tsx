import { formatCurrency } from "@/lib/utils";
import { siteContent } from "@/lib/content/site";

interface FeesDisclosureProps {
  rent: number;
  deposit: number;
  holdingDeposit?: number;
}

export function FeesDisclosure({ rent, deposit, holdingDeposit }: FeesDisclosureProps) {
  const maxDeposit = Math.min(rent * 5, deposit);

  return (
    <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm">
      <h3 className="font-semibold">Permitted payments (Tenant Fees Act 2019)</h3>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        <li>Tenancy deposit: up to {formatCurrency(maxDeposit)} (capped at five weeks&apos; rent)</li>
        {holdingDeposit !== undefined && (
          <li>Holding deposit: up to {formatCurrency(Math.min(rent, holdingDeposit))}</li>
        )}
        <li>{siteContent.fees.holdingDepositNote}</li>
        <li>{siteContent.fees.tenancyDepositNote}</li>
      </ul>
    </div>
  );
}
