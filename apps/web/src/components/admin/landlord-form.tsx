"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

export interface PersonFormValues {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

interface LandlordFormProps {
  initial?: PersonFormValues;
  onSuccess?: () => void;
  compact?: boolean;
}

export function LandlordForm({ initial, onSuccess, compact }: LandlordFormProps) {
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
      isEdit ? `/api/admin/landlords/${initial!.id}` : "/api/admin/landlords",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      setError(isEdit ? "Could not update landlord" : "Could not add landlord");
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
        <Label htmlFor="first_name">First name</Label>
        <Input
          id="first_name"
          name="first_name"
          required
          defaultValue={initial?.firstName ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="last_name">Last name</Label>
        <Input
          id="last_name"
          name="last_name"
          required
          defaultValue={initial?.lastName ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add landlord"}
        </Button>
      </div>
    </form>
  );
}
