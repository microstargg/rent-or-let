"use client";

import { useRouter } from "next/navigation";

const statuses = ["new", "triaged", "scheduled", "completed", "cancelled"];

export function TicketStatusSelect({ id, status }: { id: string; status: string }) {
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
      className="min-h-11 rounded-md border bg-background px-3 py-2 text-sm capitalize"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
