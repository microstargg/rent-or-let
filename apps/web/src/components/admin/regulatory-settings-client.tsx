"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegulatorySettingsClient({
  redressScheme,
  redressMemberNumber,
  requirePrsNumber,
}: {
  redressScheme: string | null;
  redressMemberNumber: string | null;
  requirePrsNumber: boolean;
}) {
  const [scheme, setScheme] = useState(redressScheme ?? "");
  const [member, setMember] = useState(redressMemberNumber ?? "");
  const [requirePrs, setRequirePrs] = useState(requirePrsNumber);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redress_scheme: scheme || null,
        redress_member_number: member || null,
        require_prs_number: requirePrs,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Saved" : `Not saved: ${data.error ?? "something went wrong"}`);
  }

  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-semibold">Redress scheme and PRS Database</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Letting agents must belong to a redress scheme. Landlord PRS Database numbers are added on Landlords.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="redress_scheme">Redress scheme</Label>
          <select
            id="redress_scheme"
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
          >
            <option value="">Not set</option>
            <option value="tpo">The Property Ombudsman</option>
            <option value="prs">Property Redress Scheme</option>
          </select>
        </div>
        <div>
          <Label htmlFor="redress_member">Membership number</Label>
          <Input id="redress_member" className="mt-1" value={member} onChange={(e) => setMember(e.target.value)} />
        </div>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={requirePrs} onChange={(e) => setRequirePrs(e.target.checked)} />
        <span>Stop portal sync for landlords without a PRS Database number. Turn on once the database is live.</span>
      </label>
      <Button type="button" className="mt-3" size="sm" onClick={save} disabled={busy}>
        Save
      </Button>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}
