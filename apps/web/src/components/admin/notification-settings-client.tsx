"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIGEST_LABELS, type DigestFrequency } from "@/lib/notifications/preferences";

export function NotificationSettingsClient({
  email,
  digest: initialDigest,
  instantEmail: initialInstant,
  isAdmin,
  complianceAlerts: initialAudience,
  emailNote,
}: {
  email: string;
  digest: DigestFrequency;
  instantEmail: boolean;
  isAdmin: boolean;
  complianceAlerts: "admins" | "everyone";
  emailNote: string | null;
}) {
  const [digest, setDigest] = useState(initialDigest);
  const [instantEmail, setInstantEmail] = useState(initialInstant);
  const [audience, setAudience] = useState(initialAudience);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest, instantEmail }),
      });
      if (!res.ok) throw new Error();
      if (isAdmin && audience !== initialAudience) {
        const r2 = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ compliance_alerts: audience }),
        });
        if (!r2.ok) throw new Error();
      }
      setMessage("Saved");
    } catch {
      setMessage("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your emails</CardTitle>
          <p className="text-sm text-muted-foreground">Sent to {email}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {emailNote && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {emailNote}
            </p>
          )}
          <div>
            <Label htmlFor="digest">Morning email</Label>
            <select
              id="digest"
              value={digest}
              onChange={(e) => setDigest(e.target.value as DigestFrequency)}
              className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(DIGEST_LABELS) as DigestFrequency[]).map((k) => (
                <option key={k} value={k}>
                  {DIGEST_LABELS[k]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Around 7am UK time: your jobs and tasks for the day, plus certificate and inspection
              alerts if you receive those. Skipped when there is nothing to report.{" "}
              <Link href="/settings/notifications/preview" className="underline">
                Preview my morning email
              </Link>
            </p>
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={instantEmail}
              onChange={(e) => setInstantEmail(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">Instant emails for urgent things</span>
              <span className="block text-xs text-muted-foreground">
                When a job is assigned to you, or a tenant reports an emergency repair.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certificate alerts (agency-wide)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Who hears about expiring certificates, overdue inspections and overdue pet requests.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              [
                ["admins", "Admins only", "Plus anyone a certificate task is assigned to."],
                ["everyone", "Everyone", "All staff get the alerts in the bell and morning email."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="compliance_alerts"
                  className="mt-1 h-4 w-4"
                  checked={audience === value}
                  onChange={() => setAudience(value)}
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" className="min-h-11" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
