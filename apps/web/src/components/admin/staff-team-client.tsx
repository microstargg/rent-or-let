"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StaffRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

type InviteRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

export function StaffTeamClient({
  staff: initialStaff,
  invites: initialInvites,
}: {
  staff: StaffRow[];
  invites: InviteRow[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    if (Array.isArray(data.staff)) setStaff(data.staff);
    if (Array.isArray(data.invites)) setInvites(data.invites);
  }

  async function addMember() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not add staff");
      return;
    }
    if (data.status === "already_staff") setMessage("That email is already staff on this agency.");
    else if (data.status === "added") {
      setMessage("Added. They can sign in on this subdomain with the same Google account.");
      setEmail("");
      setFullName("");
    } else if (data.status === "invited") {
      setMessage("Invite saved. They get access the next time they sign in on this subdomain.");
      setEmail("");
      setFullName("");
    }
    await refresh();
  }

  return (
    <section className="rounded-xl border p-4">
      <h2 className="font-semibold">Team</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The same Google or email login can be staff on more than one agency. Access is decided by
        the subdomain they sign in on (for example veri.letflow.app vs pms.letflow.app).
      </p>

      {staff.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {staff.map((row) => (
            <li key={`${row.id}:${row.email}`}>
              <span className="font-medium">{row.fullName}</span>{" "}
              <span className="text-muted-foreground">{row.email}</span>{" "}
              <span className="text-muted-foreground">({row.role})</span>
            </li>
          ))}
        </ul>
      )}

      {invites.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium">Waiting to sign in</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {invites.map((row) => (
              <li key={row.id}>
                {row.fullName} {row.email} ({row.role})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="staff_full_name">Name</Label>
          <Input
            id="staff_full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="staff_email">Email</Label>
          <Input
            id="staff_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="staff_role">Role</Label>
          <select
            id="staff_role"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "staff")}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button type="button" size="sm" onClick={addMember} disabled={loading || !email || !fullName}>
          Add to this agency
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </section>
  );
}
