"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonFormValues } from "@/components/admin/landlord-form";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

interface RenterFormProps {
  initial?: PersonFormValues;
  onSuccess?: () => void;
  compact?: boolean;
}

export function RenterForm({ initial, onSuccess, compact }: RenterFormProps) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      first_name: fd.get("first_name"),
      last_name: fd.get("last_name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      notes: fd.get("notes") || null,
    };
    const res = await fetch(
      isEdit ? `/api/admin/renters/${initial!.id}` : "/api/admin/renters",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      setError(isEdit ? "Could not update renter" : "Could not add renter");
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
    if (!isEdit) (e.target as HTMLFormElement).reset();
    onSuccess?.();
    closeDialog?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        compact
          ? "grid gap-3 sm:grid-cols-2"
          : "grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
      }
    >
      <div>
        <Label htmlFor="renter_first_name">First name</Label>
        <Input
          id="renter_first_name"
          name="first_name"
          required
          defaultValue={initial?.firstName ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="renter_last_name">Last name</Label>
        <Input
          id="renter_last_name"
          name="last_name"
          required
          defaultValue={initial?.lastName ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="renter_email">Email</Label>
        <Input
          id="renter_email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="renter_phone">Phone</Label>
        <Input
          id="renter_phone"
          name="phone"
          defaultValue={initial?.phone ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="renter_notes">Notes</Label>
        <Input
          id="renter_notes"
          name="notes"
          defaultValue={initial?.notes ?? ""}
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add renter"}
        </Button>
      </div>
    </form>
  );
}
