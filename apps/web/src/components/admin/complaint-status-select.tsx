"use client";

import { useRouter } from "next/navigation";

interface ComplaintStatusSelectProps {
  id: string;
  status: string;
}

export function ComplaintStatusSelect({ id, status }: ComplaintStatusSelectProps) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    await fetch(`/api/admin/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        resolved_at: newStatus === "resolved" || newStatus === "closed" ? new Date().toISOString() : null,
      }),
    });
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      className="rounded-md border px-2 py-1 text-xs"
    >
      <option value="open">Open</option>
      <option value="investigating">Investigating</option>
      <option value="resolved">Resolved</option>
      <option value="closed">Closed</option>
    </select>
  );
}
