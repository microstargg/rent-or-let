"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPortalTicketMessage } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PortalTicketMessageForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    await addPortalTicketMessage({ ticket_id: ticketId, body });
    setBody("");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Add a message…" />
      <Button type="submit" size="sm" disabled={loading}>
        Send
      </Button>
    </form>
  );
}
