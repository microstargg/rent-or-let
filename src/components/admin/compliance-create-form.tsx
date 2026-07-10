"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ComplianceCreateForm({
  properties,
}: {
  properties: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [type, setType] = useState("gas_safety");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId) {
      setError("Select a property");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("property_id", propertyId);
      form.set("type", type);
      if (expiresAt) form.set("expires_at", expiresAt);
      if (file) form.set("file", file);
      const res = await fetch("/api/admin/compliance", { method: "POST", body: form });
      if (!res.ok) {
        setError("Could not save certificate");
        return;
      }
      setExpiresAt("");
      setFile(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <Label htmlFor="property">Property</Label>
        <select
          id="property"
          required
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="type">Certificate type</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="gas_safety">Gas safety</option>
          <option value="eicr">EICR</option>
          <option value="epc">EPC</option>
          <option value="smoke_co">Smoke/CO</option>
          <option value="right_to_rent">Right to Rent</option>
          <option value="deposit_pi">Deposit PI</option>
          <option value="rra_info_sheet">RRA info sheet</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <Label htmlFor="expires">Expiry date</Label>
        <Input
          id="expires"
          type="date"
          className="mt-1.5"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="file">Document (optional)</Label>
        <Input
          id="file"
          type="file"
          className="mt-1.5"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={loading || !properties.length}>
          {loading ? "Saving…" : "Add certificate"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
