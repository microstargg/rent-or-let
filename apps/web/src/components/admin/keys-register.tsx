"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KEY_HOLDERS, describeHolder, type KeyHolder } from "@/lib/operations/keys";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export interface KeyItem {
  id: string;
  label: string;
  keyCount: number;
  holderType: string;
  holderName: string | null;
  outSince: string | null;
  dueBack: string | null;
  notes: string | null;
}

function ukDate(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
}

function KeyRow({ k, propertyId }: { k: KeyItem; propertyId: string }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [holderType, setHolderType] = useState<KeyHolder>(k.holderType === "office" ? "contractor" : (k.holderType as KeyHolder));
  const [holderName, setHolderName] = useState(k.holderName ?? "");
  const [dueBack, setDueBack] = useState(k.dueBack ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = k.dueBack && k.dueBack < today && k.holderType !== "office";

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setMoving(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {k.label} <span className="font-normal text-muted-foreground">× {k.keyCount}</span>
          </p>
          <p className={`text-xs ${overdue ? "text-red-600" : "text-muted-foreground"}`}>
            {describeHolder(k)}
            {k.outSince && k.holderType !== "office" ? ` since ${ukDate(k.outSince)}` : ""}
            {k.dueBack && k.holderType !== "office" ? ` · ${overdue ? "overdue, was due" : "due back"} ${ukDate(k.dueBack)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {k.holderType !== "office" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => send({ action: "move", key_id: k.id, holder_type: "office" })}>
              Returned
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setMoving((m) => !m)}>
            {k.holderType === "office" ? "Sign out" : "Pass on"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Remove ${k.label} from the register?`)) send({ action: "remove", key_id: k.id });
            }}
          >
            Remove
          </Button>
        </div>
      </div>
      {moving && (
        <div className="mt-2 grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-4">
          <select value={holderType} onChange={(e) => setHolderType(e.target.value as KeyHolder)} className={selectClass}>
            {KEY_HOLDERS.filter((h) => h !== "office").map((h) => (
              <option key={h} value={h}>
                {h.charAt(0).toUpperCase() + h.slice(1)}
              </option>
            ))}
          </select>
          <Input placeholder="Name" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
          <Input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} aria-label="Due back" />
          <Button
            size="sm"
            className="h-10"
            disabled={busy || !holderName.trim()}
            onClick={() =>
              send({ action: "move", key_id: k.id, holder_type: holderType, holder_name: holderName, due_back: dueBack || null })
            }
          >
            Save
          </Button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

export function KeysRegister({ propertyId, keys }: { propertyId: string; keys: KeyItem[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [count, setCount] = useState("1");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const res = await fetch(`/api/admin/properties/${propertyId}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", label, key_count: Math.max(1, Number(count) || 1) }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not add");
      return;
    }
    setLabel("");
    setCount("1");
    router.refresh();
  }

  return (
    <div>
      {keys.length ? (
        <ul className="divide-y">
          {keys.map((k) => (
            <KeyRow key={k.id} k={k} propertyId={propertyId} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No keys logged yet.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          placeholder="e.g. Front door set, Meter cupboard"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="max-w-xs"
        />
        <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} className="w-20" aria-label="How many" />
        <Button variant="outline" onClick={add} disabled={!label.trim()}>
          Add keys
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
