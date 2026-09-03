"use client";

import { useState } from "react";
import { startRentCheckout } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";

export function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await startRentCheckout(invoiceId);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed");
            setLoading(false);
          }
        }}
      >
        {loading ? "Redirecting…" : "Pay now"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
