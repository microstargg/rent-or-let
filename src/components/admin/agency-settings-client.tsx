"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface PendingInvite {
  id: string;
  email: string;
  fullName: string;
  expiresAt: string | Date;
}

interface AgencySettingsClientProps {
  maintenanceInbox: string | null;
  inboundDomain: string;
  stripeOnboardingComplete: boolean;
  stripeAccountId: string | null;
  alertEmail: string | null;
  staff: StaffMember[];
  pendingInvites: PendingInvite[];
}

export function AgencySettingsClient({
  maintenanceInbox,
  inboundDomain,
  stripeOnboardingComplete,
  stripeAccountId,
  alertEmail: initialAlertEmail,
  staff: initialStaff,
  pendingInvites: initialPending,
}: AgencySettingsClientProps) {
  const [alertEmail, setAlertEmail] = useState(initialAlertEmail ?? "");
  const [inbox, setInbox] = useState(maintenanceInbox);
  const [loading, setLoading] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [staff, setStaff] = useState(initialStaff);
  const [pendingInvites, setPendingInvites] = useState(initialPending);

  async function refreshStaff() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    if (data.staff) setStaff(data.staff);
    if (data.pending_staff_invites) setPendingInvites(data.pending_staff_invites);
  }

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

  async function inviteStaff() {
    setStaffMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings?action=staff_invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: staffEmail, full_name: staffName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffMessage(data.error ?? "Failed to invite");
        return;
      }
      if (data.invite_url) {
        await navigator.clipboard?.writeText(data.invite_url);
      }
      setStaffMessage(
        data.email_sent ? "Invite emailed and link copied." : "Invite link copied (email not configured)."
      );
      setStaffEmail("");
      setStaffName("");
      await refreshStaff();
    } finally {
      setLoading(false);
    }
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

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Staff access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite colleagues after the first admin is seeded. They sign up with the invited email and
          gain `/admin` access.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {staff.map((member) => (
            <li key={member.id}>
              {member.fullName} — {member.email}{" "}
              <span className="text-muted-foreground">({member.role})</span>
            </li>
          ))}
          {staff.length === 0 && (
            <li className="text-muted-foreground">No staff yet — seed the first admin via SQL.</li>
          )}
        </ul>
        {pendingInvites.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pending invites
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {pendingInvites.map((invite) => (
                <li key={invite.id}>
                  {invite.fullName} — {invite.email}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="staff_name">Full name</Label>
            <Input
              id="staff_name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff_email">Email</Label>
            <Input
              id="staff_email"
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <Button
          type="button"
          className="mt-3"
          size="sm"
          onClick={inviteStaff}
          disabled={loading || !staffEmail || !staffName}
        >
          Invite staff
        </Button>
        {staffMessage && <p className="mt-2 text-sm text-muted-foreground">{staffMessage}</p>}
      </section>
    </div>
  );
}
