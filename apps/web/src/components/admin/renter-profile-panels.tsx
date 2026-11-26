"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay } from "@/lib/utils";

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const card = "rounded-xl border bg-card p-5 shadow-sm";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ukDate(iso: string | null | undefined) {
  return formatDay(iso);
}

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function RenterRightToRentPanel({
  renterId,
  checkedAt,
  method,
  expiresAt,
  shareCode,
  methods,
}: {
  renterId: string;
  checkedAt: string | null;
  method: string | null;
  expiresAt: string | null;
  shareCode: string | null;
  methods: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ checked_at: today(), method: "share_code", share_code: "", expires_at: "" });

  const now = today();
  const expired = expiresAt && expiresAt < now;
  const dueSoon = expiresAt && !expired && expiresAt <= new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/renters/${renterId}/right-to-rent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, share_code: form.share_code || null, expires_at: form.expires_at || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't save the check");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={card}>
      {checkedAt ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Last checked</dt>
            <dd className="font-medium">{ukDate(checkedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">How</dt>
            <dd className="font-medium">{methods[method ?? ""] ?? method ?? "—"}</dd>
          </div>
          {shareCode && (
            <div>
              <dt className="text-muted-foreground">Share code</dt>
              <dd className="font-mono font-medium">{shareCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Follow-up check</dt>
            <dd className={`font-medium ${expired ? "text-red-600" : dueSoon ? "text-amber-600" : ""}`}>
              {expiresAt ? `${expired ? "Overdue since" : "Due"} ${ukDate(expiresAt)}` : "Not needed (no time limit)"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No Right to Rent check recorded yet. Check every adult before the tenancy starts.</p>
      )}

      {open ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="rtr-date">Checked on</Label>
            <Input id="rtr-date" type="date" className="mt-1.5" value={form.checked_at} onChange={(e) => setForm({ ...form, checked_at: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="rtr-method">How</Label>
            <select id="rtr-method" className={selectClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {Object.entries(methods).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {form.method === "share_code" && (
            <div>
              <Label htmlFor="rtr-code">Share code</Label>
              <Input
                id="rtr-code"
                className="mt-1.5 font-mono uppercase"
                placeholder="W12 345 678"
                maxLength={20}
                value={form.share_code}
                onChange={(e) => setForm({ ...form, share_code: e.target.value.toUpperCase() })}
              />
            </div>
          )}
          <div>
            <Label htmlFor="rtr-expiry">Permission ends (if time-limited)</Label>
            <Input id="rtr-expiry" type="date" className="mt-1.5" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            For time-limited permission, the follow-up check is due when the permission ends, or 12 months after this
            check if that is later. Upload the online check result or copies of the documents below as Right to Rent
            evidence.
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save check"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          {checkedAt ? "Record a new check" : "Record check"}
        </Button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function RenterDocumentsPanel({
  renterId,
  documents,
  kinds,
}: {
  renterId: string;
  documents: {
    id: string;
    kind: string;
    label: string | null;
    filename: string;
    sizeBytes: number;
    uploadedBy: string | null;
    createdAt: string;
  }[];
  kinds: Record<string, string>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("right_to_rent");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Files must be under 4 MB. Try a lower-resolution scan or photo.");
      return;
    }
    setBusy("upload");
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      if (label.trim()) body.set("label", label.trim());
      const res = await fetch(`/api/admin/renters/${renterId}/documents`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this document? This can't be undone.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/renters/${renterId}/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={card}>
      {documents.length ? (
        <ul className="divide-y text-sm">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {kinds[d.kind] ?? d.kind}
                  {d.label ? <span className="font-normal text-muted-foreground">: {d.label}</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.filename}, {fileSize(d.sizeBytes)}. Added {ukDate(d.createdAt)}
                  {d.uploadedBy ? ` by ${d.uploadedBy}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`/api/admin/renters/${renterId}/documents/${d.id}`} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => remove(d.id)}>
                  {busy === d.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      )}

      <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="doc-kind">Type</Label>
          <select id="doc-kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(kinds).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="doc-label">Note (optional)</Label>
          <Input id="doc-label" className="mt-1.5" maxLength={120} placeholder="e.g. Passport, employer reference" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="doc-file">File (PDF or photo, under 4 MB)</Label>
          <Input id="doc-file" ref={fileRef} type="file" className="mt-1.5" accept="application/pdf,image/jpeg,image/png,image/heic,image/webp" />
        </div>
        <div className="sm:col-span-3">
          <Button size="sm" disabled={busy !== null} onClick={upload}>
            {busy === "upload" ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
