"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StatementShareActions({ statementId }: { statementId: string }) {
  const [emailLabel, setEmailLabel] = useState("Email landlord");
  const [copyLabel, setCopyLabel] = useState("Copy portal link");
  const [loading, setLoading] = useState(false);

  async function emailLandlord() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/landlord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email_statement", statement_id: statementId }),
      });
      const data = (await res.json()) as { error?: string; to?: string };
      if (!res.ok) {
        setEmailLabel(data.error ?? "Email failed");
      } else {
        setEmailLabel(data.to ? `Sent to ${data.to}` : "Sent");
      }
      setTimeout(() => setEmailLabel("Email landlord"), 2500);
    } finally {
      setLoading(false);
    }
  }

  async function copyPortalLink() {
    const url = `${window.location.origin}/login?next=${encodeURIComponent("/landlord-portal/statements")}`;
    await navigator.clipboard?.writeText(url);
    setCopyLabel("Link copied");
    setTimeout(() => setCopyLabel("Copy portal link"), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={emailLandlord} disabled={loading}>
        {loading ? "Sending…" : emailLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={copyPortalLink}>
        {copyLabel}
      </Button>
    </div>
  );
}
