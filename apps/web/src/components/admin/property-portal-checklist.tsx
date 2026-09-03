"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import {
  getPortalReadiness,
  type PortalReadinessInput,
} from "@/lib/portals/portal-readiness";

interface PropertyPortalChecklistProps {
  input: PortalReadinessInput;
}

export function PropertyPortalChecklist({ input }: PropertyPortalChecklistProps) {
  const { items, ready } = getPortalReadiness(input);
  const publishing = input.status === "available";

  if (!publishing) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4">
        <h2 className="font-semibold">Portal readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set status to Available to see the Rightmove and OnTheMarket checklist.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        ready ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Portal readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Ready to sync to Rightmove and OnTheMarket."
              : "Fix the items below before publishing to portals."}
          </p>
        </div>
        {ready ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
        ) : (
          <CircleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2 text-sm">
            {item.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            )}
            <div>
              <span className={item.ok ? "text-foreground" : "font-medium text-amber-900"}>
                {item.label}
              </span>
              {item.hint && !item.ok && (
                <p className="text-muted-foreground">{item.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
