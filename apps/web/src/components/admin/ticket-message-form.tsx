"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TicketPhotoUpload } from "@/components/admin/ticket-photo-upload";
import { TicketAiPanel } from "@/components/admin/ticket-ai-panel";

export function TicketMessageForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [internal, setInternal] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body, internal }),
    });
    setBody("");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <TicketAiPanel ticketId={ticketId} onDraft={setBody} />
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={internal ? "Note for the team (the tenant won't see it)…" : "Update for the tenant…"}
          className="min-h-[5rem]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border bg-muted/30 p-0.5 text-sm" role="radiogroup" aria-label="Who sees this">
            {[
              { value: false, label: "Send to tenant" },
              { value: true, label: "Internal note" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={internal === o.value}
                onClick={() => setInternal(o.value)}
                className={
                  internal === o.value
                    ? "rounded-md bg-background px-3 py-1 font-medium shadow-sm"
                    : "rounded-md px-3 py-1 text-muted-foreground hover:text-foreground"
                }
              >
                {o.label}
              </button>
            ))}
          </div>
          <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={loading}>
            {loading ? "Saving…" : internal ? "Save note" : "Send update"}
          </Button>
        </div>
      </form>
      <div>
        <p className="mb-2 text-sm font-medium">Photos</p>
        <TicketPhotoUpload ticketId={ticketId} />
      </div>
    </div>
  );
}
