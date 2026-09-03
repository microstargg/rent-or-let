"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/admin-page";

interface WorkOrderRow {
  workOrder: {
    id: string;
    status: string;
    scheduledFor: Date | null;
    costEstimate: string | null;
    finalCost: string | null;
  };
  contractorName: string | null;
  invoice: {
    id: string;
    amount: string;
    dueDate: string;
    status: string;
  } | null;
}

export function WorkOrderPanel({
  ticketId,
  workOrders,
  contractors,
}: {
  ticketId: string;
  workOrders: WorkOrderRow[];
  contractors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [contractorId, setContractorId] = useState(contractors[0]?.id ?? "");
  const [estimate, setEstimate] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [finalCosts, setFinalCosts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function patch(body: unknown) {
    setLoading(true);
    try {
      await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Jobs</h2>
      </div>

      <div className="mt-3 space-y-3 rounded-xl border p-4">
        <p className="text-sm font-medium">Add job</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="wo_contractor">Contractor</Label>
            <select
              id="wo_contractor"
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="wo_estimate">Estimate (£)</Label>
            <Input
              id="wo_estimate"
              type="number"
              step="0.01"
              inputMode="decimal"
              className="mt-1 min-h-11"
              placeholder="0.00"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="wo_schedule">Schedule</Label>
            <Input
              id="wo_schedule"
              type="date"
              className="mt-1 min-h-11"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          disabled={loading}
          onClick={() => {
            void patch({
              work_order: {
                action: "create",
                contractor_id: contractorId || null,
                cost_estimate: estimate ? Number(estimate) : null,
                scheduled_for: scheduledFor || null,
              },
            }).then(() => {
              setEstimate("");
              setScheduledFor("");
            });
          }}
        >
          Add job
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {workOrders.map(({ workOrder, contractorName, invoice }) => {
          const costValue =
            finalCosts[workOrder.id] ??
            workOrder.finalCost ??
            workOrder.costEstimate ??
            "";
          const isDone =
            workOrder.status === "completed" || workOrder.status === "cancelled";

          return (
            <div key={workOrder.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{contractorName ?? "Unassigned"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workOrder.costEstimate && `Est £${workOrder.costEstimate}`}
                    {workOrder.finalCost && ` · Final £${workOrder.finalCost}`}
                    {workOrder.scheduledFor &&
                      ` · ${new Date(workOrder.scheduledFor).toLocaleDateString("en-GB")}`}
                  </p>
                  {invoice && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Invoice £{Number(invoice.amount).toFixed(2)} · {invoice.dueDate} ·{" "}
                      {invoice.status.replaceAll("_", " ")}
                    </p>
                  )}
                </div>
                <StatusBadge status={workOrder.status} />
              </div>

              {!isDone && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  {workOrder.status === "awaiting_approval" && (
                    <Button
                      type="button"
                      className="min-h-11"
                      disabled={loading}
                      onClick={() =>
                        patch({
                          work_order: { action: "approve", id: workOrder.id },
                        })
                      }
                    >
                      Approve
                    </Button>
                  )}
                  <div className="min-w-[8rem] flex-1">
                    <Label htmlFor={`final-${workOrder.id}`}>Final £</Label>
                    <Input
                      id={`final-${workOrder.id}`}
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      className="mt-1 min-h-11"
                      value={costValue}
                      onChange={(e) =>
                        setFinalCosts((prev) => ({
                          ...prev,
                          [workOrder.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={loading}
                    onClick={() =>
                      patch({
                        work_order: {
                          action: "complete",
                          id: workOrder.id,
                          final_cost: Number(
                            costValue || workOrder.costEstimate || 0
                          ),
                        },
                      })
                    }
                  >
                    Complete
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {!workOrders.length && (
          <p className="text-sm text-muted-foreground">No jobs yet</p>
        )}
      </div>
    </div>
  );
}
