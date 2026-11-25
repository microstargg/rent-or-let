"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  MeterReading,
  UtilityContact,
  UtilityNoticeKind,
  UtilityNotices,
} from "@/lib/tenancy/utility-notices";

interface Readings {
  date: string | null;
  meters: MeterReading[];
}

function ukDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UtilityNoticePanel({
  tenancyId,
  startDate,
  endDate,
  notices,
  moveIn,
  moveOut,
  savedContacts,
}: {
  tenancyId: string;
  startDate: string;
  endDate: string | null;
  notices: UtilityNotices;
  moveIn: Readings | null;
  moveOut: Readings | null;
  savedContacts: UtilityContact[];
}) {
  const router = useRouter();
  const defaultKind: UtilityNoticeKind = notices.move_in && (endDate || moveOut) ? "move_out" : "move_in";
  const [kind, setKind] = useState<UtilityNoticeKind>(defaultKind);
  const readingsFor = (k: UtilityNoticeKind) => (k === "move_in" ? moveIn : moveOut);
  const [date, setDate] = useState(defaultKind === "move_in" ? startDate : (endDate ?? moveOut?.date ?? ""));
  const [meters, setMeters] = useState<MeterReading[]>(readingsFor(defaultKind)?.meters ?? []);
  const [contacts, setContacts] = useState<UtilityContact[]>(
    savedContacts.length ? savedContacts : [{ name: "Council tax", email: "" }, { name: "Water", email: "" }]
  );
  const [forwarding, setForwarding] = useState("");
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function switchKind(k: UtilityNoticeKind) {
    setKind(k);
    const r = readingsFor(k);
    setMeters(r?.meters ?? []);
    setDate(k === "move_in" ? startDate : (endDate ?? r?.date ?? ""));
    setMessage(null);
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenancies/${tenancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "utility_notice",
          kind,
          date,
          recipients: contacts.filter((c) => c.email.trim()).map((c) => ({ name: c.name.trim(), email: c.email.trim() })),
          meters,
          forwarding_address: kind === "move_out" ? forwarding : null,
          save_contacts: save,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: string[]; failed?: string[] };
      if (!res.ok) {
        setMessage(data.error ?? "Could not send");
        return;
      }
      setMessage(`Sent to ${data.sent?.length ?? 0}.${data.failed?.length ? ` Failed: ${data.failed.join("; ")}` : ""}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const sent = notices[kind];
  const readings = readingsFor(kind);
  const ready = date && contacts.some((c) => c.email.includes("@"));

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {(["move_in", "move_out"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => switchKind(k)}
            className={`rounded-full border px-3 py-1 text-sm ${kind === k ? "border-primary bg-primary/10 font-medium" : ""}`}
          >
            {k === "move_in" ? "Move-in" : "Move-out"}
            {notices[k] ? " ✓" : ""}
          </button>
        ))}
      </div>

      {sent && (
        <p className="mt-3 text-sm text-muted-foreground">
          Sent {ukDate(sent.sentAt)} to {sent.to.join(", ")}. You can send it again below.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label>{kind === "move_in" ? "Move-in date" : "Move-out date"}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Meter readings</Label>
            {!meters.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                No {kind === "move_in" ? "check-in" : "check-out"} readings yet. Add them to the inspection, or type them
                here.
              </p>
            )}
            {readings?.date && meters.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">From the {kind === "move_in" ? "check-in" : "check-out"} on {ukDate(readings.date)}.</p>
            )}
            <div className="mt-1.5 space-y-2">
              {(meters.length ? meters : [{ type: "electricity", reading: "" }, { type: "gas", reading: "" }, { type: "water", reading: "" }]).map(
                (m, i) => (
                  <div key={m.type} className="flex items-center gap-2">
                    <span className="w-24 text-sm capitalize">{m.type}</span>
                    <Input
                      value={m.reading}
                      onChange={(e) => {
                        const base = meters.length ? meters : [{ type: "electricity", reading: "" }, { type: "gas", reading: "" }, { type: "water", reading: "" }];
                        setMeters(base.map((x, idx) => (idx === i ? { ...x, reading: e.target.value } : x)));
                      }}
                      placeholder="Reading"
                    />
                  </div>
                )
              )}
            </div>
          </div>
          {kind === "move_out" && (
            <div>
              <Label>Tenants&apos; forwarding address (optional)</Label>
              <Textarea rows={2} value={forwarding} onChange={(e) => setForwarding(e.target.value)} className="mt-1.5" />
            </div>
          )}
        </div>

        <div>
          <Label>Send to</Label>
          <div className="mt-1.5 space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={c.name}
                  placeholder="Who"
                  className="w-32"
                  onChange={(e) => setContacts(contacts.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                />
                <Input
                  value={c.email}
                  type="email"
                  placeholder="Email"
                  onChange={(e) => setContacts(contacts.map((x, idx) => (idx === i ? { ...x, email: e.target.value } : x)))}
                />
                <Button variant="ghost" size="sm" onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))} aria-label="Remove">
                  ×
                </Button>
              </div>
            ))}
            {contacts.length < 8 && (
              <button type="button" className="text-xs text-primary underline" onClick={() => setContacts([...contacts, { name: "", email: "" }])}>
                Add someone (e.g. the energy supplier)
              </button>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
            Remember these contacts for other tenancies
          </label>
          <Button className="mt-4" onClick={send} disabled={busy || !ready}>
            {busy ? "Sending…" : `Send ${kind === "move_in" ? "move-in" : "move-out"} notice`}
          </Button>
          {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    </div>
  );
}
