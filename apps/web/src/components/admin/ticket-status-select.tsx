"use client";

import { useRouter } from "next/navigation";
import { humanize } from "@/lib/utils";

const statuses = ["new", "triaged", "scheduled", "completed", "cancelled"];

export function TicketStatusSelect({ id, status, compact }: { id: string; status: string; compact?: boolean }) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      aria-label="Ticket status"
      className={compact ? "h-8 rounded-md border bg-background px-2 text-sm" : "min-h-11 rounded-md border bg-background px-3 py-2 text-sm"}
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {humanize(s)}
        </option>
      ))}
    </select>
  );
}
