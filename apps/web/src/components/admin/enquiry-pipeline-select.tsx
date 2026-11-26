"use client";

import { useRouter } from "next/navigation";
import { BookViewingForm } from "@/components/admin/viewings-panel";

export const PIPELINE_STAGES: Array<{ value: string; label: string }> = [
  { value: "new", label: "New" },
  { value: "viewing_booked", label: "Viewing booked" },
  { value: "application", label: "Applied" },
  { value: "referencing", label: "Referencing" },
  { value: "offer", label: "Offer" },
  { value: "closed_won", label: "Let agreed" },
  { value: "closed_lost", label: "Not going ahead" },
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
        {PIPELINE_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {propertyId && <BookViewingForm propertyId={propertyId} enquiryId={id} compact />}
    </div>
  );
}
