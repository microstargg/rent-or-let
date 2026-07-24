"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BankConnectionSummary {
  id: string;
  status: string;
  accountName: string | null;
  accountNumberMask: string | null;
  consentExpiresAt: string | Date | null;
  lastSyncedAt: string | Date | null;
  meta?: { accounts?: Array<{ account_id: string; display_name?: string; account_type?: string }> };
}

interface AgencySettingsClientProps {
  maintenanceInbox: string | null;
  inboundDomain: string;
  stripeOnboardingComplete: boolean;
  stripeAccountId: string | null;
  alertEmail: string | null;
  truelayerConfigured: boolean;
  bankConnections: BankConnectionSummary[];
  bankSelectConnectionId?: string | null;
}

export function AgencySettingsClient({
  maintenanceInbox,
  inboundDomain,
  stripeOnboardingComplete,
  stripeAccountId,
  alertEmail: initialAlertEmail,
  truelayerConfigured,
  bankConnections: initialConnections,
  bankSelectConnectionId,
}: AgencySettingsClientProps) {
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [inbox, setInbox] = useState(maintenanceInbox);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState(initialConnections);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const active = useMemo(
    () => connections.find((c) => c.status === "active") ?? connections[0] ?? null,
    [connections]
  );

  const selectConnection = useMemo(() => {
    const id = bankSelectConnectionId;
    if (!id) return connections.find((c) => c.status === "select_account") ?? null;
    return connections.find((c) => c.id === id) ?? null;
  }, [connections, bankSelectConnectionId]);

  async function saveSettings() {
    setLoading(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_email: alertEmail || null }),
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

  async function connectBank() {
    setLoading(true);
    const res = await fetch("/api/admin/settings?action=bank_feed_connect", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
    else setSyncMsg(data.error ?? "Could not start bank link");
  }

  async function selectAccount(accountId: string) {
    if (!selectConnection) return;
    setLoading(true);
    const res = await fetch("/api/admin/bank-feed?action=select_account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: selectConnection.id, accountId }),
    });
    setLoading(false);
    if (res.ok) window.location.href = "/admin/settings?bank=connected";
  }

  async function syncNow() {
    setLoading(true);
    setSyncMsg(null);
    const res = await fetch("/api/admin/bank-feed?action=sync", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.error) setSyncMsg(data.error);
    else {
      setSyncMsg(
        `Synced ${data.synced ?? 0} new credits · auto-matched ${data.matched ?? 0} · queued ${data.exceptions ?? 0}`
      );
      const refresh = await fetch("/api/admin/bank-feed");
      const body = await refresh.json();
      if (body.connections) setConnections(body.connections);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Recommended rent rails</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Direct Debit via the platform</span>{" "}
            (GoCardless — coming soon): preferred long-term so payment events are authoritative.
          </li>
          <li>
            <span className="font-medium text-foreground">Open Banking bank feed</span> (below):
            link your client money account so standing orders and bank transfers auto-reconcile.
          </li>
          <li>
            <span className="font-medium text-foreground">Stripe Connect</span>: optional card
            “Pay now” for convenience — not required as the overnight primary path.
          </li>
          <li>
            <span className="font-medium text-foreground">Manual mark paid</span>: fallback when a
            credit cannot be matched.
          </li>
        </ol>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Client money bank feed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link the designated client money account via Open Banking (TrueLayer). Inbound credits are
          matched to open invoices; ambiguous ones land in Payment exceptions.
        </p>
        {!truelayerConfigured ? (
          <p className="mt-2 text-sm text-amber-700">
            TrueLayer is not configured on this deploy. Add TRUELAYER_CLIENT_ID / SECRET to enable
            linking.
          </p>
        ) : active?.status === "active" ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-green-700">
              Connected: {active.accountName ?? "Account"}
              {active.accountNumberMask ? ` (${active.accountNumberMask})` : ""}
            </p>
            {active.lastSyncedAt && (
              <p className="text-muted-foreground">
                Last synced {new Date(active.lastSyncedAt).toLocaleString("en-GB")}
              </p>
            )}
            {active.consentExpiresAt && (
              <p className="text-muted-foreground">
                Consent expires {new Date(active.consentExpiresAt).toLocaleDateString("en-GB")} —
                reconnect before then.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={syncNow} disabled={loading}>
                Sync now
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={connectBank} disabled={loading}>
                Reconnect
              </Button>
            </div>
          </div>
        ) : selectConnection?.status === "select_account" ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm">Choose the client money account to watch:</p>
            {(selectConnection.meta?.accounts ?? []).map((a) => (
              <Button
                key={a.account_id}
                type="button"
                size="sm"
                variant="outline"
                className="mr-2"
                disabled={loading}
                onClick={() => selectAccount(a.account_id)}
              >
                {a.display_name ?? a.account_type ?? a.account_id}
              </Button>
            ))}
          </div>
        ) : (
          <Button type="button" className="mt-2" size="sm" onClick={connectBank} disabled={loading}>
            Link client money account
          </Button>
        )}
        {syncMsg && <p className="mt-2 text-sm text-muted-foreground">{syncMsg}</p>}
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
          Card payments in the renter portal. Useful for ad-hoc “Pay now”; Direct Debit + bank feed
          cover most UK rent collection.
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
          Save
        </Button>
      </section>
    </div>
  );
}
