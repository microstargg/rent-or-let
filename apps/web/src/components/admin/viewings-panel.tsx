"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VIEWING_OUTCOMES, outcomeLabel } from "@/lib/lettings/viewings";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export interface ViewingItem {
  id: string;
  scheduledAt: string;
  address: string;
  propertyId: string;
  viewer: string | null;
  contact: string | null;
  outcome: string | null;
  feedback: string | null;
  confirmedAt: string | null;
  reminderSentAt: string | null;
  feedbackSentAt: string | null;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultSlot() {
  const d = new Date(Date.now() + 2 * 86_400_000);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}

/** Book a viewing for an enquiry (contact comes from the enquiry) or a walk-in (type the viewer's details). */
export function BookViewingForm({
  propertyId,
  enquiryId,
  askForViewer = false,
  compact = false,
}: {
  propertyId: string;
  enquiryId?: string;
  askForViewer?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(defaultSlot);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function book() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/lettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book_viewing",
          property_id: propertyId,
          enquiry_id: enquiryId,
          scheduled_at: new Date(at).toISOString(),
          attendee_name: askForViewer ? name : undefined,
          attendee_email: askForViewer ? email : undefined,
          attendee_phone: askForViewer ? phone : undefined,
          send_confirmation: confirm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        confirmation?: { email: boolean; sms: boolean; errors: string[] } | null;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Could not book the viewing");
        return;
      }
      const c = data.confirmation;
      setMessage(
        !confirm
          ? "Booked."
          : c && (c.email || c.sms)
            ? `Booked and confirmed by ${[c.email && "email", c.sms && "text"].filter(Boolean).join(" and ")}.`
            : `Booked. Confirmation not sent${c?.errors.length ? `: ${c.errors[0]}` : "."}`
      );
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={compact ? "text-xs text-primary underline" : "text-sm font-medium text-primary hover:underline"}
        >
          Book viewing
        </button>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div>
        <Label className="text-xs">Date and time</Label>
        <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="mt-1" />
      </div>
      {askForViewer && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Viewer's name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Mobile" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      )}
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        Send a confirmation by email (and text, if set up)
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={book} disabled={busy || !at || (askForViewer && !name.trim())}>
          {busy ? "Booking…" : "Book"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {message && <p className="text-xs text-red-600">{message}</p>}
    </div>
  );
}

function ViewingCard({ v, showAddress }: { v: ViewingItem; showAddress: boolean }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState(v.outcome ?? "");
  const [feedback, setFeedback] = useState(v.feedback ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const past = new Date(v.scheduledAt).getTime() < Date.now();

  async function act(body: Record<string, unknown>) {
    setBusy(String(body.action));
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/viewings/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong");
        return false;
      }
      if (body.action === "send_feedback") setMessage(`Sent to ${data.to}.`);
      if (body.action === "send_confirmation") setMessage("Confirmation sent.");
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  const flags = [
    v.confirmedAt && "confirmed",
    v.reminderSentAt && "reminded",
    v.feedbackSentAt && "feedback sent to landlord",
  ].filter(Boolean);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {when(v.scheduledAt)}
            {showAddress && <span className="font-normal text-muted-foreground"> · {v.address}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {v.viewer ?? "Viewer not named"}
            {v.contact ? ` · ${v.contact}` : ""}
            {flags.length ? ` · ${flags.join(", ")}` : ""}
          </p>
          {v.feedback && !editing && <p className="mt-1 whitespace-pre-wrap text-sm">{v.feedback}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 text-xs">{outcomeLabel(v.outcome)}</span>
          {!past && !v.confirmedAt && !v.outcome && (
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act({ action: "send_confirmation" })}>
              Confirm
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
            {past && !v.outcome ? "Record outcome" : "Update"}
          </Button>
        </div>
      </div>
      {editing && (
        <div className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={selectClass}>
            <option value="">Still booked</option>
            {VIEWING_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Textarea
            rows={3}
            placeholder="What did they think? This is what the landlord sees."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!!busy}
              onClick={async () => {
                if (await act({ action: "outcome", outcome: outcome || null, feedback })) setEditing(false);
              }}
            >
              Save
            </Button>
            {v.feedback && (
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act({ action: "send_feedback" })}>
                {v.feedbackSentAt ? "Send feedback again" : "Email feedback to landlord"}
              </Button>
            )}
          </div>
        </div>
      )}
      {message && <p className="mt-1 text-xs text-muted-foreground">{message}</p>}
    </li>
  );
}

export function ViewingsList({
  viewings,
  showAddress = false,
  empty = "No viewings.",
}: {
  viewings: ViewingItem[];
  showAddress?: boolean;
  empty?: string;
}) {
  if (!viewings.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {viewings.map((v) => (
        <ViewingCard key={v.id} v={v} showAddress={showAddress} />
      ))}
    </ul>
  );
}
