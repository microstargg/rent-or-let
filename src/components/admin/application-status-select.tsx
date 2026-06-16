"use client";

import { useRouter } from "next/navigation";

interface ApplicationStatusSelectProps {
  id: string;
  status: string;
}

export function ApplicationStatusSelect({ id, status }: ApplicationStatusSelectProps) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/admin/applications/${id}`, {
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
      className="rounded-md border px-2 py-1 text-xs"
    >
      <option value="submitted">Submitted</option>
      <option value="reviewing">Reviewing</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  );
}
