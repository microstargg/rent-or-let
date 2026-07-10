"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";

function AcceptLandlordInviteInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function complete() {
    const res = await fetch("/api/landlord-invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: userId, email }),
    });
    const data = await res.json();
    setResult(res.ok ? "Accepted — go to /landlord-portal" : data.error ?? "Failed");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Accept landlord invite</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in first, then paste your auth user id and email to link the portal.
      </p>
      <div className="mt-6 space-y-3">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Auth user id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="button" onClick={complete} disabled={!token || !userId || !email}>
          Complete invite
        </Button>
        {result && <p className="text-sm">{result}</p>}
      </div>
    </div>
  );
}

export default function AcceptLandlordInvitePage() {
  return (
    <Suspense>
      <AcceptLandlordInviteInner />
    </Suspense>
  );
}
