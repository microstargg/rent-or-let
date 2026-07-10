"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortalTicket } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewPortalTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await createPortalTicket({
        summary: fd.get("summary") as string,
        description: (fd.get("description") as string) || undefined,
        location_area: (fd.get("location_area") as string) || null,
      });
      router.push("/portal/tickets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ticket");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">New ticket</h1>
      <form onSubmit={handleSubmit} className="mt-8 max-w-lg space-y-4">
        <div>
          <Label htmlFor="summary">Summary</Label>
          <Input id="summary" name="summary" required />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} />
        </div>
        <div>
          <Label htmlFor="location_area">Location (e.g. kitchen, bathroom)</Label>
          <Input id="location_area" name="location_area" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit ticket"}
        </Button>
      </form>
    </div>
  );
}
