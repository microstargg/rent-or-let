"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDialogClose } from "@/components/admin/admin-entity-dialog";

const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/** Log a complaint that came in by phone, email or in person. */
export function ComplaintLogForm({ properties }: { properties: { id: string; label: string }[] }) {
  const router = useRouter();
  const closeDialog = useEntityDialogClose();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_name: fd.get("tenant_name"),
        tenant_email: fd.get("tenant_email"),
        subject: fd.get("subject"),
        description: fd.get("description"),
        property_id: fd.get("property_id") || null,
        source: fd.get("source"),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? data.issues?.[0]?.message ?? "Couldn't log the complaint");
      return;
    }
    form.reset();
    router.refresh();
    closeDialog?.();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="c-name">Who complained</Label>
        <Input id="c-name" name="tenant_name" required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="c-email">Their email</Label>
        <Input id="c-email" name="tenant_email" type="email" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="c-property">Property</Label>
        <select id="c-property" name="property_id" defaultValue="" className={selectClass}>
          <option value="">None</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="c-source">How it came in</Label>
        <select id="c-source" name="source" defaultValue="phone" className={selectClass}>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="in_person">In person</option>
          <option value="letter">Letter</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="c-subject">Subject</Label>
        <Input id="c-subject" name="subject" required className="mt-1.5" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="c-desc">What it's about</Label>
        <textarea
          id="c-desc"
          name="description"
          required
          rows={4}
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Log complaint"}
        </Button>
      </div>
    </form>
  );
}

/** Add a response sent to the complainant, or an internal note, to the timeline. */
export function ComplaintResponseForm({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"response" | "note">("response");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: text.trim(), response_kind: kind }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Couldn't save that");
      return;
    }
    setText("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add response
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full space-y-2">
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name={`kind-${id}`} checked={kind === "response"} onChange={() => setKind("response")} />
          Response sent to them
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name={`kind-${id}`} checked={kind === "note"} onChange={() => setKind("note")} />
          Internal note
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        placeholder={kind === "response" ? "What you told them, and how (call, email, letter)…" : "Note for the team…"}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading || !text.trim()}>
          {loading ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
