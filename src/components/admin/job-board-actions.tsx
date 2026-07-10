"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { TicketPhotoUpload } from "@/components/admin/ticket-photo-upload";

interface JobBoardActionsProps {
  ticketId: string;
  workOrderId: string;
  status: string;
  costEstimate: string | null;
  finalCost: string | null;
}

export function JobBoardActions({
  ticketId,
  workOrderId,
  status,
  costEstimate,
  finalCost,
}: JobBoardActionsProps) {
  const router = useRouter();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [cost, setCost] = useState(finalCost ?? costEstimate ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDone = status === "completed" || status === "cancelled";
  const canApprove = status === "awaiting_approval";
  const canComplete = !isDone;

  async function patch(body: unknown) {
    const res = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Request failed");
    router.refresh();
  }

  async function approve() {
    await patch({ work_order: { action: "approve", id: workOrderId } });
  }

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const final = Number(cost || costEstimate || 0);
      await patch({
        work_order: {
          action: "complete",
          id: workOrderId,
          final_cost: final,
        },
      });
      if (note.trim()) {
        await patch({ message: note.trim() });
      }
      setCompleteOpen(false);
      setNote("");
    } catch {
      setError("Could not complete job");
    } finally {
      setLoading(false);
    }
  }

  async function postUpdate() {
    if (!note.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await patch({ message: note.trim() });
      setUpdateOpen(false);
      setNote("");
    } catch {
      setError("Could not post update");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button asChild variant="outline" className="min-h-11 flex-1 sm:flex-none">
        <Link href={`/admin/tickets/${ticketId}`}>Open ticket</Link>
      </Button>

      {canApprove && (
        <AdminConfirmDialog
          title="Approve this job?"
          description="High-cost jobs need approval before they can be completed."
          confirmLabel="Approve"
          confirmVariant="default"
          onConfirm={approve}
          trigger={
            <Button type="button" className="min-h-11 flex-1 sm:flex-none">
              Approve
            </Button>
          }
        />
      )}

      {canComplete && (
        <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="min-h-11 flex-1 sm:flex-none">
              Complete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete job</DialogTitle>
              <DialogDescription>
                Enter the final cost and an optional update for the ticket thread.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" htmlFor={`final-${workOrderId}`}>
                  Final cost (£)
                </label>
                <Input
                  id={`final-${workOrderId}`}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="mt-1 min-h-11"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor={`note-${workOrderId}`}>
                  Update (optional)
                </label>
                <Textarea
                  id={`note-${workOrderId}`}
                  className="mt-1"
                  rows={3}
                  placeholder="What was done on site…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setCompleteOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11"
                onClick={complete}
                disabled={loading}
              >
                {loading ? "Saving…" : "Mark complete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="secondary" className="min-h-11 flex-1 sm:flex-none">
            Add update
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Field update</DialogTitle>
            <DialogDescription>
              Post a note and optional photo so the office can see progress.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Arrived on site / waiting for parts / tenant update…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[6rem]"
          />
          <TicketPhotoUpload ticketId={ticketId} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setUpdateOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              onClick={postUpdate}
              disabled={loading || !note.trim()}
            >
              {loading ? "Posting…" : "Post update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
