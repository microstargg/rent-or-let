"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";
import {
  HOLDING_DEPOSIT_DEADLINE_DAYS,
  HOLDING_DEPOSIT_OUTCOMES,
  addDaysIso,
  weeklyRent,
} from "@/lib/tenancy/deposits";
import { REFERENCING_STATUSES } from "@/lib/tenancy/referencing";

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";


export function ApplicationChecksForm({
  applicationId,
  monthlyRent,
  referencing,
  holding,
}: {
  applicationId: string;
  monthlyRent: number | null;
  referencing: { status: string; provider: string; reference: string; note: string };
  holding: { amount: string; paidAt: string; outcome: string; note: string };
}) {
  const router = useRouter();
  const close = useEntityDialogClose();
  const [ref, setRef] = useState(referencing);
  const [hold, setHold] = useState(holding);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cap = monthlyRent ? weeklyRent(monthlyRent) : null;

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/lettings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Couldn't save");
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post({
        action: "set_referencing",
        referencing_status: ref.status,
        referencing_provider: ref.provider || null,
        referencing_ref: ref.reference || null,
        referencing_note: ref.note || null,
      });
      if (hold.amount || hold.paidAt || hold.outcome) {
        await post({
          action: "holding_deposit",
          holding_amount: hold.amount ? Number(hold.amount) : null,
          holding_paid_at: hold.paidAt || null,
          holding_outcome: hold.outcome || null,
          holding_note: hold.note || null,
        });
      }
      router.refresh();
      close?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Referencing</h3>
        <div>
          <Label>Status</Label>
          <select className={selectClass} value={ref.status} onChange={(e) => setRef({ ...ref, status: e.target.value })}>
            {REFERENCING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Provider</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. HomeLet, Goodlord, Canopy"
              value={ref.provider}
              onChange={(e) => setRef({ ...ref, provider: e.target.value })}
            />
          </div>
          <div>
            <Label>Provider reference</Label>
            <Input className="mt-1.5" value={ref.reference} onChange={(e) => setRef({ ...ref, reference: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Input className="mt-1.5" value={ref.note} onChange={(e) => setRef({ ...ref, note: e.target.value })} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Holding deposit</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Amount</Label>
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={hold.amount}
              onChange={(e) => setHold({ ...hold, amount: e.target.value })}
            />
            {cap != null && <p className="mt-1 text-xs text-muted-foreground">Legal maximum £{cap.toFixed(2)} (one week&apos;s rent)</p>}
          </div>
          <div>
            <Label>Paid on</Label>
            <Input className="mt-1.5" type="date" value={hold.paidAt} onChange={(e) => setHold({ ...hold, paidAt: e.target.value })} />
            {hold.paidAt && !hold.outcome && (
              <p className="mt-1 text-xs text-muted-foreground">
                Agree the tenancy by {new Date(`${addDaysIso(hold.paidAt, HOLDING_DEPOSIT_DEADLINE_DAYS)}T00:00:00Z`).toLocaleDateString("en-GB")}, or refund it within 7 days.
              </p>
            )}
          </div>
        </div>
        <div>
          <Label>Outcome</Label>
          <select className={selectClass} value={hold.outcome} onChange={(e) => setHold({ ...hold, outcome: e.target.value })}>
            <option value="">Still held</option>
            {HOLDING_DEPOSIT_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {hold.outcome === "retained" && (
          <div>
            <Label>Reason given to the applicant in writing</Label>
            <Input className="mt-1.5" value={hold.note} onChange={(e) => setHold({ ...hold, note: e.target.value })} />
          </div>
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
