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
  currentUserId,
  canManage = false,
}: {
  staff: StaffRow[];
  invites: InviteRow[];
  currentUserId?: string | null;
  /** Admins can change roles and remove people. */
  canManage?: boolean;
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function change(method: "PATCH" | "DELETE", body: Record<string, string>) {
    setRowError(null);
    const res = await fetch("/api/admin/staff", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setRowError(data.error ?? "That didn't work");
    setConfirming(null);
    await refresh();
  }

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
        Everyone who can sign in to this agency. Admins can change roles and remove people.
      </p>

      {(staff.length > 0 || invites.length > 0) && (
        <ul className="mt-3 divide-y rounded-lg border text-sm">
          {staff.map((row) => {
            const isMe = row.id === currentUserId;
            const key = `staff:${row.id}`;
            return (
              <li key={key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {row.fullName}
                    {isMe && <span className="font-normal text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="break-all text-xs text-muted-foreground">{row.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !isMe ? (
                    <select
                      aria-label={`Role for ${row.fullName}`}
                      value={row.role}
                      onChange={(e) => change("PATCH", { id: row.id, role: e.target.value })}
                      className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-muted-foreground">{row.role === "admin" ? "Admin" : "Staff"}</span>
                  )}
                  {canManage && !isMe &&
                    (confirming === key ? (
                      <>
                        <Button type="button" size="sm" variant="destructive" onClick={() => change("DELETE", { id: row.id, kind: "staff" })}>
                          Remove
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(key)}>
                        Remove
                      </Button>
                    ))}
                </div>
              </li>
            );
          })}
          {invites.map((row) => (
            <li key={`invite:${row.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{row.fullName}</p>
                <p className="break-all text-xs text-muted-foreground">{row.email} · invited, not signed in yet</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{row.role === "admin" ? "Admin" : "Staff"}</span>
                {canManage && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => change("DELETE", { id: row.id, kind: "invite" })}>
                    Cancel invite
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {rowError && <p className="mt-2 text-sm text-red-600">{rowError}</p>}

      <h3 className="mt-5 text-sm font-semibold">Add someone</h3>
      <div className="mt-2 space-y-3">
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
