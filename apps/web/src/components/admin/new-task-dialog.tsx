"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { StaffOption } from "@/components/admin/assignee-select";

function todayInput(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Office task on the jobs board ("Chase gas safety for 12 Acklam Rd"). */
export function NewTaskDialog({
  staff,
  currentStaffId,
  propertyId,
  triggerLabel = "New task",
}: {
  staff: StaffOption[];
  currentStaffId?: string | null;
  propertyId?: string | null;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState(todayInput());
  const [assignee, setAssignee] = useState(currentStaffId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          due_at: due ? `${due}T12:00:00Z` : null,
          assignee_staff_id: assignee || null,
          ...(propertyId ? { related_type: "property", related_id: propertyId } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      setTitle("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Could not add the task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="min-h-11">
          <Plus className="mr-1 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Office jobs like chasing a certificate or booking a check-in. The person you pick
            gets a notification and sees it in their morning email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task_title">What needs doing</Label>
            <Input
              id="task_title"
              className="mt-1 min-h-11"
              placeholder="Chase gas safety for 12 Acklam Road"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="task_assignee">Assign to</Label>
              <select
                id="task_assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Nobody yet</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="task_due">Due</Label>
              <Input
                id="task_due"
                type="date"
                className="mt-1 min-h-11"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="task_notes">Notes (optional)</Label>
            <Textarea
              id="task_notes"
              className="mt-1"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" className="min-h-11" onClick={() => void submit()} disabled={loading || !title.trim()}>
            {loading ? "Adding…" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
