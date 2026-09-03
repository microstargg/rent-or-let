"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PetRequestActions({
  id,
  overdue,
}: {
  id: string;
  overdue: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(status: "approved" | "refused" | "info_requested" | "awaiting_superior") {
    setLoading(status);
    await fetch("/api/admin/pets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, notes }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {overdue && (
        <p className="text-sm font-medium text-red-700">Deadline passed — respond today.</p>
      )}
      <Textarea
        rows={2}
        placeholder="Written decision / request for more information"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={Boolean(loading)} onClick={() => decide("approved")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={Boolean(loading)} onClick={() => decide("refused")}>
          Refuse
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(loading)}
          onClick={() => decide("info_requested")}
        >
          Request info
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={Boolean(loading)}
          onClick={() => decide("awaiting_superior")}
        >
          Superior landlord
        </Button>
      </div>
    </div>
  );
}
