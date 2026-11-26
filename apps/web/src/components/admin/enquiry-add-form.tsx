"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/** Log a phone, walk-in or email enquiry by hand. */
export function EnquiryAddForm({ properties }: { properties: { id: string; label: string }[] }) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/lettings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_enquiry",
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        property_id: fd.get("property_id") || null,
        source: fd.get("source"),
        message: fd.get("message"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save the enquiry");
      return;
    }
    form.reset();
    router.refresh();
    closeDialog?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="enq-name">Name</Label>
        <Input id="enq-name" name="name" required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="enq-phone">Phone</Label>
        <Input id="enq-phone" name="phone" type="tel" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="enq-email">Email</Label>
        <Input id="enq-email" name="email" type="email" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="enq-property">Property</Label>
        <select id="enq-property" name="property_id" className={selectClass} defaultValue="">
          <option value="">Not sure yet</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="enq-source">How they got in touch</Label>
        <select id="enq-source" name="source" className={selectClass} defaultValue="phone">
          <option value="phone">Phone</option>
          <option value="walk_in">Walk in</option>
          <option value="email">Email</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="enq-message">Notes</Label>
        <textarea
          id="enq-message"
          name="message"
          rows={3}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="What they're looking for, when they can move, pets…"
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Add enquiry"}
        </Button>
      </div>
    </form>
  );
}
