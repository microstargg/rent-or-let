"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";

export function ContractorDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function remove() {
    await fetch(`/api/admin/contractors/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <AdminConfirmDialog
      title={`Remove ${name}?`}
      description="Existing jobs keep their history but will no longer show this contractor."
      confirmLabel="Remove"
      onConfirm={remove}
      trigger={
        <Button type="button" size="sm" variant="ghost" className="text-red-700">
          Remove
        </Button>
      }
    />
  );
}
