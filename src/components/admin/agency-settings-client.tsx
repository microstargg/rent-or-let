"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AgencySettingsClientProps {
  maintenanceInbox: string | null;
  inboundDomain: string;
  stripeOnboardingComplete: boolean;
  stripeAccountId: string | null;
  alertEmail: string | null;
  clientAccountName: string | null;
  clientAccountSortCode: string | null;
  clientAccountNumber: string | null;
}

export function AgencySettingsClient({
  maintenanceInbox,
  inboundDomain,
  stripeOnboardingComplete,
  stripeAccountId,
  alertEmail: initialAlertEmail,
  clientAccountName: initialAccountName,
  clientAccountSortCode: initialSortCode,
  clientAccountNumber: initialAccountNumber,
}: AgencySettingsClientProps) {
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [accountName, setAccountName] = useState(initialAccountName ?? "");
  const [sortCode, setSortCode] = useState(initialSortCode ?? "");
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber ?? "");
  const [inbox, setInbox] = useState(maintenanceInbox);
  const [loading, setLoading] = useState(false);
  const [refMsg, setRefMsg] = useState<string | null>(null);

  async function saveSettings() {
    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert_email: alertEmail || null,
        client_account_name: accountName || null,
        client_account_sort_code: sortCode || null,
        client_account_number: accountNumber || null,
      }),
    });
    const data = await res.json();
    const token = data.settings?.maintenance_inbox_token;
    if (token && inboundDomain) setInbox(`maintenance+${token}@${inboundDomain}`);
    setLoading(false);
  }

  async function connectStripe() {
    const res = await fetch("/api/admin/settings?action=stripe_connect", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function backfillRefs() {
    setLoading(true);
    setRefMsg(null);
    const res = await fetch("/api/admin/settings?action=backfill_payment_refs", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setRefMsg(data.error ?? "Backfill failed");
    else setRefMsg(`Assigned payment references to ${data.updated ?? 0} active tenancies`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Recommended rent rails</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Standing order + unique payment reference</span>
            : tenants pay free bank transfer using their ROL-XXXXXX ref; import statements to match.
          </li>
          <li>
            <span className="font-medium text-foreground">CSV statement import</span> (Finance →
            Exceptions): reconcile without third-party fees.
          </li>
          <li>
            <span className="font-medium text-foreground">Stripe Connect</span>: optional card “Pay
            now”.
          </li>
          <li>
            <span className="font-medium text-foreground">Manual mark paid</span>: fallback.
          </li>
        </ol>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Client money pay-in details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown to tenants in the renter portal for standing orders / bank transfers. Use your
          designated client money account.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="client_account_name">Account name</Label>
            <Input
              id="client_account_name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="client_account_sort_code">Sort code</Label>
            <Input
              id="client_account_sort_code"
              value={sortCode}
              onChange={(e) => setSortCode(e.target.value)}
              placeholder="00-00-00"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="client_account_number">Account number</Label>
            <Input
              id="client_account_number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={saveSettings} disabled={loading}>
            Save account details
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={backfillRefs} disabled={loading}>
            Backfill payment refs
          </Button>
        </div>
        {refMsg && <p className="mt-2 text-sm text-muted-foreground">{refMsg}</p>}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Maintenance inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Forward maintenance emails to this address (requires RESEND_INBOUND_DOMAIN).
        </p>
        {inbox ? (
          <p className="mt-2 break-all font-mono text-sm">{inbox}</p>
        ) : (
          <Button type="button" className="mt-2" size="sm" onClick={saveSettings} disabled={loading}>
            Generate inbox address
          </Button>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Stripe Connect (optional)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Card payments in the renter portal. Prefer standing order + payment reference for day-to-day
          rent.
        </p>
        {stripeOnboardingComplete ? (
          <p className="mt-2 text-sm text-green-700">Connected {stripeAccountId && `(${stripeAccountId})`}</p>
        ) : (
          <Button type="button" className="mt-2" size="sm" onClick={connectStripe}>
            Connect Stripe
          </Button>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Alert email</h2>
        <div className="mt-2">
          <Label htmlFor="alert_email">Fallback notification email</Label>
          <Input
            id="alert_email"
            type="email"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="button" className="mt-3" size="sm" onClick={saveSettings} disabled={loading}>
          Save alert email
        </Button>
      </section>
    </div>
  );
}
