"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TenantApplicationFormProps {
  properties: { id: string; label: string }[];
}

export function TenantApplicationForm({ properties }: TenantApplicationFormProps) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = useState<Record<string, string>>({});

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    setStatus("loading");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: formData.property_id || null,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          employment_status: formData.employment_status,
          annual_income: formData.annual_income ? Number(formData.annual_income) : null,
          current_address: formData.current_address,
          move_in_date: formData.move_in_date || null,
          occupants: Number(formData.occupants) || 1,
          pets: formData.pets === "yes",
          pets_details: formData.pets_details || null,
          additional_info: formData.additional_info || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-8 rounded-xl border bg-green-50 p-6">
        <h2 className="font-semibold text-green-900">Application submitted</h2>
        <p className="mt-2 text-sm text-green-800">
          Thank you. We will review your application and contact you within 2 working days.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                value={formData.first_name ?? ""}
                onChange={(e) => updateField("first_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last name *</Label>
              <Input
                id="last_name"
                value={formData.last_name ?? ""}
                onChange={(e) => updateField("last_name", e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="property_id">Property applying for</Label>
            <select
              id="property_id"
              value={formData.property_id ?? ""}
              onChange={(e) => updateField("property_id", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">General application</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setStep(2)} disabled={!formData.first_name || !formData.email}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Employment &amp; accommodation</h2>
          <div>
            <Label htmlFor="employment_status">Employment status *</Label>
            <select
              id="employment_status"
              value={formData.employment_status ?? ""}
              onChange={(e) => updateField("employment_status", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="">Select…</option>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="student">Student</option>
              <option value="retired">Retired</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="annual_income">Annual income (£)</Label>
            <Input
              id="annual_income"
              type="number"
              value={formData.annual_income ?? ""}
              onChange={(e) => updateField("annual_income", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="current_address">Current address *</Label>
            <Textarea
              id="current_address"
              value={formData.current_address ?? ""}
              onChange={(e) => updateField("current_address", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="move_in_date">Preferred move-in date</Label>
              <Input
                id="move_in_date"
                type="date"
                value={formData.move_in_date ?? ""}
                onChange={(e) => updateField("move_in_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="occupants">Number of occupants</Label>
              <Input
                id="occupants"
                type="number"
                min={1}
                value={formData.occupants ?? "1"}
                onChange={(e) => updateField("occupants", e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!formData.current_address}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Additional information</h2>
          <div>
            <Label htmlFor="pets">Do you have pets?</Label>
            <select
              id="pets"
              value={formData.pets ?? "no"}
              onChange={(e) => updateField("pets", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {formData.pets === "yes" && (
            <div>
              <Label htmlFor="pets_details">Pet details</Label>
              <Textarea
                id="pets_details"
                value={formData.pets_details ?? ""}
                onChange={(e) => updateField("pets_details", e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="additional_info">Anything else we should know?</Label>
            <Textarea
              id="additional_info"
              value={formData.additional_info ?? ""}
              onChange={(e) => updateField("additional_info", e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            By submitting, you consent to us processing your data for referencing and tenancy
            purposes. See our Privacy Notice.
          </p>
          {status === "error" && (
            <p className="text-sm text-red-600">Submission failed. Please try again.</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={status === "loading"}>
              {status === "loading" ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
