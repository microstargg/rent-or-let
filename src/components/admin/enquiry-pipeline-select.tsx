"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = [
  "new",
  "viewing_booked",
  "application",
  "referencing",
  "offer",
  "closed_won",
  "closed_lost",
];

function defaultViewingLocalValue() {
  const when = new Date();
  when.setDate(when.getDate() + 2);
  when.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T${pad(when.getHours())}:${pad(when.getMinutes())}`;
}

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
  const [scheduledAt, setScheduledAt] = useState(defaultViewingLocalValue);
  const [booking, setBooking] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function setStage(pipeline_stage: string) {
    await fetch("/api/admin/lettings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pipeline", enquiry_id: id, pipeline_stage }),
    });
    router.refresh();
  }

  async function bookViewing() {
    if (!propertyId || !scheduledAt) return;
    setBooking(true);
    try {
      await fetch("/api/admin/lettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "book_viewing",
          enquiry_id: id,
          property_id: propertyId,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      setShowPicker(false);
      router.refresh();
    } finally {
      setBooking(false);
    }
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
      {propertyId && (
        <>
          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="text-left text-xs text-primary underline"
            >
              Book viewing
            </button>
          ) : (
            <div className="mt-1 space-y-1 rounded border bg-muted/30 p-2">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded border px-2 py-1 text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={bookViewing}
                  disabled={booking}
                  className="text-xs font-medium text-primary underline"
                >
                  {booking ? "Booking…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="text-xs text-muted-foreground underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
