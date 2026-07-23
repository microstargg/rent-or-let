"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RenterInviteButton({ renterId, email }: { renterId: string; email: string }) {
  const [label, setLabel] = useState("Portal invite");
  const [loading, setLoading] = useState(false);

  async function sendInvite() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings?action=renter_invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renter_id: renterId, email }),
      });
      const data = await res.json();
      if (data.invite_url) {
        await navigator.clipboard?.writeText(data.invite_url);
        setLabel(data.email_sent ? "Sent & copied" : "Link copied");
        setTimeout(() => setLabel("Portal invite"), 2500);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={sendInvite} disabled={loading}>
      {loading ? "Generating…" : label}
    </Button>
  );
}
