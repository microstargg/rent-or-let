"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssigneeSelect, type StaffOption } from "@/components/admin/assignee-select";

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

export function TaskCardActions({
  taskId,
  assigneeStaffId,
  dueAt,
  href,
  staff,
}: {
  taskId: string;
  assigneeStaffId: string | null;
  dueAt: Date | string | null;
  href: string | null;
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [due, setDue] = useState(toDateInput(dueAt));
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function markDone() {
    setLoading(true);
    setError(null);
    try {
      const res = await patch({ status: "done" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update the task");
    } finally {
      setLoading(false);
    }
  }

  async function changeDue(value: string) {
    setDue(value);
    setError(null);
    // Midday UK time keeps the date stable across BST / GMT.
    const res = await patch({ due_at: value ? `${value}T12:00:00Z` : null });
    if (!res.ok) setError("Could not change the date");
    else router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Button
        type="button"
        className="min-h-11 flex-1 sm:flex-none"
        disabled={loading}
        onClick={() => void markDone()}
      >
        {loading ? "Saving…" : "Mark done"}
      </Button>
      {href && (
        <Button asChild variant="outline" className="min-h-11 flex-1 sm:flex-none">
          <Link href={href}>Open</Link>
        </Button>
      )}
      <AssigneeSelect
        id={`task-assignee-${taskId}`}
        value={assigneeStaffId}
        staff={staff}
        save={(id) => patch({ assignee_staff_id: id })}
      />
      <div className="flex items-center gap-2">
        <label htmlFor={`task-due-${taskId}`} className="text-xs font-medium text-muted-foreground">
          Due
        </label>
        <Input
          id={`task-due-${taskId}`}
          type="date"
          className="min-h-9 w-auto"
          value={due}
          onChange={(e) => void changeDue(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
