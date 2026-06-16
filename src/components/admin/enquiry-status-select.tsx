"use client";

import { useRouter } from "next/navigation";

interface EnquiryStatusSelectProps {
  id: string;
  status: string;
}

export function EnquiryStatusSelect({ id, status }: EnquiryStatusSelectProps) {
  const router = useRouter();

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch(`/api/admin/enquiries/${id}`, {
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
      <option value="new">New</option>
      <option value="in_progress">In progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}
