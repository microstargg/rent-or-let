"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TicketPhotoUpload } from "@/components/admin/ticket-photo-upload";

export function TicketMessageForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body }),
    });
    setBody("");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Reply or field update…"
          className="min-h-[5rem]"
        />
        <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={loading}>
          {loading ? "Sending…" : "Send update"}
        </Button>
      </form>
      <div>
        <p className="mb-2 text-sm font-medium">Photos</p>
        <TicketPhotoUpload ticketId={ticketId} />
      </div>
    </div>
  );
}
