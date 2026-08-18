"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TicketAiPanel({
  ticketId,
  onDraft,
}: {
  ticketId: string;
  onDraft?: (text: string) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: "triage" | "apply_triage" | "draft_reply") {
    setBusy(action);
    setNote(null);
    const res = await fetch(`/api/admin/ai/tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setNote(data.error ?? "AI failed");
      return;
    }
    if (data.suggestion) {
      setNote(
        `${data.applied ? "Applied: " : "Suggested: "}${data.suggestion.priority} · ${data.suggestion.category}${data.suggestion.isEmergency ? " · emergency" : ""} — ${data.suggestion.rationale}`
      );
      if (data.applied) router.refresh();
    }
    if (data.draft && onDraft) onDraft(data.draft);
  }

  return (
    <div className="rounded-xl border p-3">
      <p className="text-sm font-medium">AI assist</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => run("triage")}>
          {busy === "triage" ? "…" : "Suggest triage"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => run("apply_triage")}>
          {busy === "apply_triage" ? "…" : "Apply triage"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => run("draft_reply")}>
          {busy === "draft_reply" ? "…" : "Draft reply"}
        </Button>
      </div>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
