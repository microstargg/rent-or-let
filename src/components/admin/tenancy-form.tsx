"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

interface TenancyFormProps {
  properties: { id: string; label: string }[];
  renters: { id: string; label: string }[];
  onSuccess?: () => void;
  compact?: boolean;
}

export function TenancyForm({ properties, renters, onSuccess, compact }: TenancyFormProps) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyFilter, setPropertyFilter] = useState("");
  const [renterFilter, setRenterFilter] = useState("");

  const filteredProperties = useMemo(() => {
    const q = propertyFilter.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => p.label.toLowerCase().includes(q));
  }, [properties, propertyFilter]);

  const filteredRenters = useMemo(() => {
    const q = renterFilter.trim().toLowerCase();
    if (!q) return renters;
    return renters.filter((r) => r.label.toLowerCase().includes(q));
  }, [renters, renterFilter]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/tenancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: fd.get("property_id"),
        primary_renter_id: fd.get("primary_renter_id"),
        rent_amount: Number(fd.get("rent_amount")),
        deposit_amount: fd.get("deposit_amount") ? Number(fd.get("deposit_amount")) : null,
        start_date: fd.get("start_date"),
        deposit_scheme: fd.get("deposit_scheme") || null,
      }),
    });
    if (!res.ok) {
      setError("Could not create tenancy");
    } else {
      router.refresh();
      (e.target as HTMLFormElement).reset();
      setPropertyFilter("");
      setRenterFilter("");
      onSuccess?.();
      closeDialog?.();
    }
    setLoading(false);
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
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="property_filter">Property</Label>
        <Input
          id="property_filter"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          placeholder="Filter properties…"
        />
        <select
          id="property_id"
          name="property_id"
          required
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select property</option>
          {filteredProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {propertyFilter && !filteredProperties.length && (
          <p className="text-xs text-muted-foreground">No properties match that filter.</p>
        )}
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label htmlFor="renter_filter">Renter</Label>
        <Input
          id="renter_filter"
          value={renterFilter}
          onChange={(e) => setRenterFilter(e.target.value)}
          placeholder="Filter renters…"
        />
        <select
          id="primary_renter_id"
          name="primary_renter_id"
          required
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select renter</option>
          {filteredRenters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        {renterFilter && !filteredRenters.length && (
          <p className="text-xs text-muted-foreground">No renters match that filter.</p>
        )}
      </div>
      <div>
        <Label htmlFor="rent_amount">Rent (£/month)</Label>
        <Input id="rent_amount" name="rent_amount" type="number" step="0.01" required />
      </div>
      <div>
        <Label htmlFor="deposit_amount">Deposit</Label>
        <Input id="deposit_amount" name="deposit_amount" type="number" step="0.01" />
      </div>
      <div>
        <Label htmlFor="start_date">Start date</Label>
        <Input id="start_date" name="start_date" type="date" required />
      </div>
      <div>
        <Label htmlFor="deposit_scheme">Deposit scheme</Label>
        <Input id="deposit_scheme" name="deposit_scheme" />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create tenancy"}
        </Button>
      </div>
    </form>
  );
}
