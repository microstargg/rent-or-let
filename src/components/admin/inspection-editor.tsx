"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ELEMENT_CONDITIONS,
  parseInspectionReport,
  type InspectionReport,
} from "@/lib/inspections/report";

export function InspectionEditor({
  inspectionId,
  initialMeta,
  initialNotes,
  initialSummary,
  completed,
}: {
  inspectionId: string;
  initialMeta: unknown;
  initialNotes?: string | null;
  initialSummary?: string | null;
  completed: boolean;
}) {
  const router = useRouter();
  const [report, setReport] = useState<InspectionReport>(() => parseInspectionReport(initialMeta));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateRoom(index: number, patch: Partial<InspectionReport["rooms"][number]>) {
    setReport((current) => ({
      ...current,
      rooms: current.rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    }));
  }

  async function save(complete = false) {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/inspections/${inspectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report, notes, summary, complete }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed");
      return;
    }
    setMessage(complete ? "Inspection completed" : "Saved");
    router.refresh();
  }

  async function uploadPhoto(roomIndex: number, elementIndex: number, file: File) {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/admin/inspections/${inspectionId}`, {
      method: "PATCH",
      body: form,
    });
    const doc = await res.json();
    if (!res.ok || !doc.url) return;
    setReport((current) => ({
      ...current,
      rooms: current.rooms.map((room, ri) =>
        ri !== roomIndex
          ? room
          : {
              ...room,
              elements: room.elements.map((el, ei) =>
                ei !== elementIndex ? el : { ...el, photoUrls: [...el.photoUrls, doc.url] }
              ),
            }
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="insp-summary">Summary</Label>
        <Input id="insp-summary" className="mt-1.5" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="insp-notes">Notes</Label>
        <Textarea id="insp-notes" className="mt-1.5" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div>
        <h2 className="font-semibold">Meters</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {report.meters.map((meter, i) => (
            <div key={meter.type}>
              <Label className="capitalize">{meter.type}</Label>
              <Input
                className="mt-1.5"
                value={meter.reading}
                onChange={(e) =>
                  setReport((current) => ({
                    ...current,
                    meters: current.meters.map((m, idx) =>
                      idx === i ? { ...m, reading: e.target.value } : m
                    ),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {report.rooms.map((room, ri) => (
        <div key={`${room.name}-${ri}`} className="rounded-xl border p-4">
          <h3 className="font-semibold">{room.name}</h3>
          <div className="mt-3 space-y-3">
            {room.elements.map((el, ei) => (
              <div key={`${el.name}-${ei}`} className="grid gap-2 sm:grid-cols-3">
                <p className="text-sm font-medium">{el.name}</p>
                <select
                  className="h-10 rounded-md border bg-background px-2 text-sm"
                  value={el.condition}
                  onChange={(e) =>
                    updateRoom(ri, {
                      elements: room.elements.map((item, idx) =>
                        idx === ei
                          ? { ...item, condition: e.target.value as (typeof ELEMENT_CONDITIONS)[number] }
                          : item
                      ),
                    })
                  }
                >
                  {ELEMENT_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Notes"
                  value={el.notes}
                  onChange={(e) =>
                    updateRoom(ri, {
                      elements: room.elements.map((item, idx) =>
                        idx === ei ? { ...item, notes: e.target.value } : item
                      ),
                    })
                  }
                />
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs sm:col-span-3"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(ri, ei, file);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saving} onClick={() => save(false)}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        {!completed && (
          <Button type="button" disabled={saving} onClick={() => save(true)}>
            Complete inspection
          </Button>
        )}
        <Button asChild variant="secondary">
          <a href={`/api/inspections/${inspectionId}/pdf`} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
