"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StaffOption {
  id: string;
  name: string;
}

/** Inline "Assigned to" picker. Saves on change via the given endpoint. */
export function AssigneeSelect({
  id,
  value,
  staff,
  save,
  className,
  label = "Assigned to",
}: {
  id: string;
  value: string | null;
  staff: StaffOption[];
  save: (assigneeStaffId: string | null) => Promise<Response>;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function onChange(next: string) {
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setError(false);
    try {
      const res = await save(next || null);
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setCurrent(previous);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={current}
        disabled={saving}
        onChange={(e) => void onChange(e.target.value)}
        className="min-h-9 min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm sm:flex-none"
      >
        <option value="">Nobody</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">Not saved</span>}
    </div>
  );
}

export function JobAssigneeSelect({
  ticketId,
  workOrderId,
  value,
  staff,
}: {
  ticketId: string;
  workOrderId: string;
  value: string | null;
  staff: StaffOption[];
}) {
  return (
    <AssigneeSelect
      id={`assignee-${workOrderId}`}
      value={value}
      staff={staff}
      className="mt-3"
      save={(assigneeStaffId) =>
        fetch(`/api/admin/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            work_order: { action: "assign", id: workOrderId, assignee_staff_id: assigneeStaffId },
          }),
        })
      }
    />
  );
}
