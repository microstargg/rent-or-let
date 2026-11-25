"use client";

import { useRouter } from "next/navigation";
import { BookViewingForm } from "@/components/admin/viewings-panel";

const STAGES = [
  "new",
  "viewing_booked",
  "application",
  "referencing",
  "offer",
  "closed_won",
  "closed_lost",
];

export function EnquiryPipelineSelect({
  id,
  stage,
  propertyId,
}: {
  id: string;
  stage: string;
  propertyId?: string | null;
}) {
  const router = useRouter();

  async function setStage(pipeline_stage: string) {
    await fetch("/api/admin/lettings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pipeline", enquiry_id: id, pipeline_stage }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {propertyId && <BookViewingForm propertyId={propertyId} enquiryId={id} compact />}
    </div>
  );
}
