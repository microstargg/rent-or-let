"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LandlordInviteButton({ landlordId }: { landlordId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("Portal invite");
  const [loading, setLoading] = useState(false);

  async function invite() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "landlord_invite", landlord_id: landlordId }),
      });
      const data = await res.json();
      if (data.url) {
        await navigator.clipboard?.writeText(data.url);
        setLabel("Link copied");
        setTimeout(() => setLabel("Portal invite"), 2000);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={invite} disabled={loading}>
      {loading ? "Generating…" : label}
    </Button>
  );
}
