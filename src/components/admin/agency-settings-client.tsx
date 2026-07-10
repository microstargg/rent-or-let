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
}

export function AgencySettingsClient({
  maintenanceInbox,
  inboundDomain,
  stripeOnboardingComplete,
  stripeAccountId,
  alertEmail: initialAlertEmail,
}: AgencySettingsClientProps) {
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [inbox, setInbox] = useState(maintenanceInbox);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
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
        <h2 className="font-semibold">Stripe Connect</h2>
        <p className="mt-1 text-sm text-muted-foreground">Accept online rent payments in the renter portal.</p>
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
