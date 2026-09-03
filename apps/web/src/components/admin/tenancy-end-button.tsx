"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";

export function TenancyEndButton({ id }: { id: string }) {
  const router = useRouter();

  async function endTenancy() {
    await fetch(`/api/admin/tenancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    router.refresh();
  }

  return (
    <AdminConfirmDialog
      title="End this tenancy?"
      description="The tenancy will be marked ended and the property will be marked vacant."
      confirmLabel="End tenancy"
      onConfirm={endTenancy}
      trigger={
        <Button type="button" size="sm" variant="outline" className="text-red-700">
          End tenancy
        </Button>
      }
    />
  );
}
