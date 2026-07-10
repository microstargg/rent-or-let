"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

export function TicketCreateForm({
  properties,
  compact,
}: {
  properties: { id: string; label: string }[];
  compact?: boolean;
}) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState("");

  const filtered = propertyFilter.trim()
    ? properties.filter((p) =>
        p.label.toLowerCase().includes(propertyFilter.trim().toLowerCase())
      )
    : properties;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: fd.get("property_id"),
        summary: fd.get("summary"),
        description: fd.get("description"),
        priority: fd.get("priority") || undefined,
      }),
    });
    router.refresh();
    setLoading(false);
    (e.target as HTMLFormElement).reset();
    setPropertyFilter("");
    closeDialog?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? "grid gap-3" : "grid gap-3 rounded-xl border p-4"}
    >
      <div className="space-y-2">
        <Label htmlFor="property_filter">Property</Label>
        <Input
          id="property_filter"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          placeholder="Filter properties…"
          className="min-h-11"
        />
        <select
          id="property_id"
          name="property_id"
          required
          className="min-h-11 w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Select property</option>
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="summary">Summary</Label>
        <Input id="summary" name="summary" required className="min-h-11" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <select
          id="priority"
          name="priority"
          className="min-h-11 w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Normal</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <Button type="submit" className="min-h-11" disabled={loading}>
        {loading ? "Creating…" : "Create ticket"}
      </Button>
    </form>
  );
}
