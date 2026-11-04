"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MoneySettingsClient(props: {
  feePercent: number;
  vatRegistered: boolean;
  vatRate: number;
  lateInterest: { enabled: boolean; baseRate: number | null; margin: number };
  arrearsReminders: { enabled: boolean; sms: boolean };
  smsConfigured: boolean;
}) {
  const [fee, setFee] = useState(String(props.feePercent));
  const [vat, setVat] = useState(props.vatRegistered);
  const [vatRate, setVatRate] = useState(String(props.vatRate));
  const [interestOn, setInterestOn] = useState(props.lateInterest.enabled);
  const [base, setBase] = useState(props.lateInterest.baseRate == null ? "" : String(props.lateInterest.baseRate));
  const [margin, setMargin] = useState(String(props.lateInterest.margin));
  const [reminders, setReminders] = useState(props.arrearsReminders.enabled);
  const [sms, setSms] = useState(props.arrearsReminders.sms);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        management_fee_percent: Number(fee) || 0,
        vat_registered: vat,
        vat_rate: Number(vatRate) || 20,
        late_fee_rules: {
          enabled: interestOn,
          base_rate: base === "" ? null : Number(base),
          margin: Math.min(3, Number(margin) || 0),
        },
        arrears_reminders: { enabled: reminders, sms },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Saved" : `Not saved: ${data.error ?? "something went wrong"}`);
  }

  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-semibold">Fees, interest and arrears</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="fee">Default management fee %</Label>
          <Input id="fee" className="mt-1" type="number" min="0" max="50" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Landlords can have their own rate.</p>
        </div>
        <div>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} />
            VAT registered: add VAT to fees
          </label>
          {vat && (
            <Input className="mt-2 w-28" type="number" min="0" max="50" step="0.1" value={vatRate} onChange={(e) => setVatRate(e.target.value)} aria-label="VAT rate %" />
          )}
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Late rent interest</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The only late payment charge allowed: once rent is over 14 days late, at no more than 3% above the Bank of
        England base rate, from the due date. Update the base rate when it changes.
      </p>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={interestOn} onChange={(e) => setInterestOn(e.target.checked)} />
        Charge interest on late rent
      </label>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="base">Bank of England base rate %</Label>
          <Input id="base" className="mt-1" type="number" min="0" max="25" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="margin">Margin over base % (max 3)</Label>
          <Input id="margin" className="mt-1" type="number" min="0" max="3" step="0.25" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Arrears reminders</h3>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={reminders} onChange={(e) => setReminders(e.target.checked)} />
        Email tenants automatically at 3, 10 and 21 days overdue
      </label>
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={sms} disabled={!props.smsConfigured} onChange={(e) => setSms(e.target.checked)} />
        Text them too{!props.smsConfigured && " (needs SMS set up: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)"}
      </label>

      <Button type="button" className="mt-4" size="sm" onClick={save} disabled={busy}>
        Save
      </Button>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}
