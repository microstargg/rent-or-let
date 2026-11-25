"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";
import { SERVICE_LEVELS } from "@/lib/finance/fees";

export interface PersonFormValues {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  prsRegistrationNumber?: string | null;
  serviceLevel?: string | null;
  feePercent?: string | null;
  lettingFee?: string | null;
  nrlStatus?: string | null;
  nrlApprovalRef?: string | null;
}

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

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
      prs_registration_number: fd.get("prs_registration_number") || null,
      service_level: fd.get("service_level") || null,
      fee_percent: fd.get("fee_percent") ? Number(fd.get("fee_percent")) : null,
      letting_fee: fd.get("letting_fee") ? Number(fd.get("letting_fee")) : null,
      nrl_status: fd.get("nrl_status") || null,
      nrl_approval_ref: fd.get("nrl_approval_ref") || null,
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
      const data = await res.json().catch(() => ({}));
      const fallback = isEdit ? "Could not update landlord" : "Could not add landlord";
      setError(data.error ? `${fallback}: ${data.error}` : fallback);
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
        <Label htmlFor="prs_registration_number">PRS Database registration number</Label>
        <Input
          id="prs_registration_number"
          name="prs_registration_number"
          defaultValue={initial?.prsRegistrationNumber ?? ""}
          placeholder="Needed before the property can be advertised once the database is live"
        />
      </div>
      <div>
        <Label htmlFor="service_level">Service</Label>
        <select id="service_level" name="service_level" className={selectClass} defaultValue={initial?.serviceLevel ?? "fully_managed"}>
          {SERVICE_LEVELS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="fee_percent">Management fee % (blank = agency default)</Label>
        <Input id="fee_percent" name="fee_percent" type="number" min="0" max="50" step="0.01" defaultValue={initial?.feePercent ?? ""} />
      </div>
      <div>
        <Label htmlFor="letting_fee">Letting fee per new tenancy (£, before VAT)</Label>
        <Input id="letting_fee" name="letting_fee" type="number" min="0" step="0.01" defaultValue={initial?.lettingFee ?? ""} />
      </div>
      <div>
        <Label htmlFor="nrl_status">Lives abroad (NRL scheme)</Label>
        <select id="nrl_status" name="nrl_status" className={selectClass} defaultValue={initial?.nrlStatus ?? ""}>
          <option value="">No, UK resident</option>
          <option value="approved">Yes, HMRC approved to receive rent gross</option>
          <option value="withhold">Yes, not approved: withhold basic rate tax</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="nrl_approval_ref">HMRC NRL approval reference</Label>
        <Input id="nrl_approval_ref" name="nrl_approval_ref" defaultValue={initial?.nrlApprovalRef ?? ""} />
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
