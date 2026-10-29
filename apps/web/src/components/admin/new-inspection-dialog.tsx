"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TenancyOption {
  id: string;
  label: string;
  propertyId: string;
}

const TYPES = [
  { value: "move_in", label: "Check-in (move-in)" },
  { value: "interim", label: "Interim" },
  { value: "move_out", label: "Check-out (move-out)" },
] as const;

export function NewInspectionDialog({
  tenancies,
  defaultTenancyId,
}: {
  tenancies: TenancyOption[];
  defaultTenancyId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tenancyId, setTenancyId] = useState(defaultTenancyId ?? tenancies[0]?.id ?? "");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("move_in");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = tenancies.find((t) => t.id === tenancyId);

  async function create() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selected.propertyId,
          tenancy_id: selected.id,
          type,
          scheduled_at: date ? new Date(`${date}T09:00:00`).toISOString() : null,
        }),
      });
      const row = await res.json().catch(() => ({}));
      if (!res.ok || !row.id) throw new Error(row.error ?? "Could not create inspection");
      setOpen(false);
      router.push(`/inspections/${row.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create inspection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11">
          New inspection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New inspection</DialogTitle>
          <DialogDescription>
            Interim and check-out inspections copy the rooms from the check-in so you can compare
            each item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-insp-tenancy">Tenancy</Label>
            <select
              id="new-insp-tenancy"
              value={tenancyId}
              onChange={(e) => setTenancyId(e.target.value)}
              className="mt-1.5 flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {!tenancies.length && <option value="">No tenancies yet</option>}
              {tenancies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="new-insp-type">Type</Label>
            <select
              id="new-insp-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="mt-1.5 flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="new-insp-date">Date</Label>
            <Input
              id="new-insp-date"
              type="date"
              className="mt-1.5 min-h-11"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" className="min-h-11" onClick={create} disabled={loading || !selected}>
            {loading ? "Creating…" : "Create and open"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
