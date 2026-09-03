"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConvertApplicationButton({
  applicationId,
  rentAmount,
}: {
  applicationId: string;
  rentAmount?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function convert() {
    setLoading(true);
    try {
      await fetch("/api/admin/lettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert_application",
          application_id: applicationId,
          rent_amount: rentAmount ?? 1000,
          start_date: new Date().toISOString().slice(0, 10),
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={convert} disabled={loading}>
      {loading ? "Converting…" : "Convert to tenancy"}
    </Button>
  );
}
