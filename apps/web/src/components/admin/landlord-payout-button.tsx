"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LandlordPayoutButton({ landlordId }: { landlordId: string }) {
  const router = useRouter();

  async function pay() {
    await fetch("/api/admin/finance/landlord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payout", landlord_id: landlordId }),
    });
    router.refresh();
  }

  return (
    <Button type="button" size="sm" onClick={pay}>
      Mark paid
    </Button>
  );
}
