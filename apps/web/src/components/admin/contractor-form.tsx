"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

export interface ContractorFormValues {
  id?: string;
  name?: string;
  trade?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export function ContractorForm({ initial }: { initial?: ContractorFormValues }) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial?.id);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: fd.get("name"),
      trade: fd.get("trade") || null,
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      notes: fd.get("notes") || null,
    };
    const res = await fetch(
      isEdit ? `/api/admin/contractors/${initial!.id}` : "/api/admin/contractors",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const fallback = isEdit ? "Could not update contractor" : "Could not add contractor";
      setError(data.error ? `${fallback}: ${data.error}` : fallback);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
    if (!isEdit) form.reset();
    closeDialog?.();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="contractor_name">Name</Label>
        <Input id="contractor_name" name="name" required defaultValue={initial?.name ?? ""} />
      </div>
      <div>
        <Label htmlFor="contractor_trade">Trade</Label>
        <Input
          id="contractor_trade"
          name="trade"
          placeholder="e.g. plumbing, electrical"
          defaultValue={initial?.trade ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="contractor_email">Email</Label>
        <Input
          id="contractor_email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
        />
        <p className="mt-1 text-xs text-muted-foreground">Job assignments are emailed here.</p>
      </div>
      <div>
        <Label htmlFor="contractor_phone">Phone</Label>
        <Input id="contractor_phone" name="phone" defaultValue={initial?.phone ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="contractor_notes">Notes</Label>
        <Input id="contractor_notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Add contractor"}
        </Button>
      </div>
    </form>
  );
}
