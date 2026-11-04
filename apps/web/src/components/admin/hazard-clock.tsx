"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface HazardStepView {
  key: string;
  label: string;
  dueAt: string | null;
  doneAt: string | null;
  state: "done" | "overdue" | "due_soon" | "pending" | "waiting";
}

const stateText: Record<HazardStepView["state"], string> = {
  done: "Done",
  overdue: "Overdue",
  due_soon: "Due soon",
  pending: "Due",
  waiting: "After the investigation",
};

const stateClass: Record<HazardStepView["state"], string> = {
  done: "text-emerald-700 dark:text-emerald-400",
  overdue: "text-red-600 dark:text-red-400 font-medium",
  due_soon: "text-amber-700 dark:text-amber-400 font-medium",
  pending: "text-muted-foreground",
  waiting: "text-muted-foreground",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function HazardClock({
  ticketId,
  level,
  awareAt,
  steps,
  saved,
}: {
  ticketId: string;
  level: "significant" | "emergency" | null;
  awareAt: string | null;
  steps: HazardStepView[];
  /** False when the clock is implied by the damp and mould category and not yet saved. */
  saved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(hazard: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hazard }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!level) {
    return (
      <p className="text-xs text-muted-foreground">
        Damp, mould or another risk to health?{" "}
        <button type="button" disabled={busy} className="text-primary underline" onClick={() => send({ action: "start", level: "significant" })}>
          Start a hazard clock
        </button>
        {" or "}
        <button type="button" disabled={busy} className="text-primary underline" onClick={() => send({ action: "start", level: "emergency" })}>
          treat as an emergency
        </button>
        .{error && <span className="ml-2 text-red-600">{error}</span>}
      </p>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Hazard response clock</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Awaab&apos;s Law timescales. They are law for social housing and expected for private rentals under the
            Renters&apos; Rights Act. Clock started {awareAt ? fmt(awareAt) : ""}.
          </p>
        </div>
        <select
          value={level}
          disabled={busy}
          onChange={(e) => send({ action: "level", level: e.target.value })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Hazard level"
        >
          <option value="significant">Significant</option>
          <option value="emergency">Emergency (24 hours)</option>
        </select>
      </div>
      <ul className="mt-3 divide-y text-sm">
        {steps.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p>{s.label}</p>
              <p className={`text-xs ${stateClass[s.state]}`}>
                {s.doneAt
                  ? `Done ${fmt(s.doneAt)}`
                  : s.state === "overdue" && s.dueAt ? `Overdue: was due ${fmt(s.dueAt)}` : `${stateText[s.state]}${s.dueAt ? ` by ${fmt(s.dueAt)}` : ""}`}
              </p>
            </div>
            {s.doneAt ? (
              <button
                type="button"
                disabled={busy}
                className="text-xs text-muted-foreground underline"
                onClick={() => send({ action: "undo", step: s.key })}
              >
                Undo
              </button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy || s.state === "waiting"} onClick={() => send({ action: "step", step: s.key })}>
                Mark done
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground">
        <span>{saved ? "" : "Started automatically because this is a damp and mould ticket."}</span>
        {saved && (
          <button type="button" className="underline" disabled={busy} onClick={() => send({ action: "stop" })}>
            Not a hazard
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
