"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ComplaintForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_name: formData.get("tenant_name"),
          tenant_email: formData.get("tenant_email"),
          subject: formData.get("subject"),
          description: formData.get("description"),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="mt-8 rounded-xl border bg-green-50 p-6 text-sm text-green-800">
        Your complaint has been logged. We will respond within 5 working days.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="tenant_name">Your name *</Label>
        <Input id="tenant_name" name="tenant_name" required />
      </div>
      <div>
        <Label htmlFor="tenant_email">Email *</Label>
        <Input id="tenant_email" name="tenant_email" type="email" required />
      </div>
      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Input id="subject" name="subject" required />
      </div>
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea id="description" name="description" rows={6} required />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}
      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Submitting…" : "Submit complaint"}
      </Button>
    </form>
  );
}
