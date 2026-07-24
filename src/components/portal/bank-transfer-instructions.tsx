export function BankTransferInstructions({
  paymentRef,
  accountName,
  sortCode,
  accountNumber,
  amount,
}: {
  paymentRef: string | null;
  accountName: string | null;
  sortCode: string | null;
  accountNumber: string | null;
  amount?: number | null;
}) {
  if (!paymentRef) {
    return (
      <div className="rounded-xl border p-4">
        <h2 className="font-semibold">Pay by bank transfer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your payment reference is not set yet. Contact the agency for standing order details.
        </p>
      </div>
    );
  }

  const hasAccount = Boolean(accountName || sortCode || accountNumber);

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-semibold">Pay by bank transfer</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use a standing order or bank transfer. You must include the payment reference exactly so we
        can match your rent.
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {hasAccount && accountName && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Account name</dt>
            <dd className="font-medium">{accountName}</dd>
          </div>
        )}
        {hasAccount && sortCode && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Sort code</dt>
            <dd className="font-medium tabular-nums">{sortCode}</dd>
          </div>
        )}
        {hasAccount && accountNumber && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Account number</dt>
            <dd className="font-medium tabular-nums">{accountNumber}</dd>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Payment reference</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tracking-wide">
              {paymentRef}
            </code>
          </dd>
        </div>
        {amount != null && amount > 0 && (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-medium tabular-nums">£{amount.toFixed(2)}</dd>
          </div>
        )}
      </dl>
      {!hasAccount && (
        <p className="mt-2 text-xs text-muted-foreground">
          Ask the agency for the client money account details if they are not shown above.
        </p>
      )}
    </div>
  );
}
