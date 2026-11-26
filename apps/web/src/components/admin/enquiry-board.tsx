"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PIPELINE_STAGES } from "@/components/admin/enquiry-pipeline-select";
import { cn } from "@/lib/utils";

export interface BoardEnquiry {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  property: string | null;
  stage: string;
  when: string;
}

/** Enquiries as columns, one per stage. Drag a card to move it on. */
export function EnquiryBoard({ enquiries }: { enquiries: BoardEnquiry[] }) {
  const router = useRouter();
  const [items, setItems] = useState(enquiries);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(id: string, stage: string) {
    const before = items;
    setItems((list) => list.map((e) => (e.id === id ? { ...e, stage } : e)));
    setError(null);
    const res = await fetch("/api/admin/lettings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_pipeline", enquiry_id: id, pipeline_stage: stage }),
    });
    if (!res.ok) {
      setItems(before);
      setError("Couldn't move that enquiry");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => {
          const cards = items.filter((e) => e.stage === stage.value);
          return (
            <section
              key={stage.value}
              aria-label={stage.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(stage.value);
              }}
              onDragLeave={() => setOver((cur) => (cur === stage.value ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const card = items.find((x) => x.id === id);
                if (card && card.stage !== stage.value) move(id, stage.value);
              }}
              className={cn(
                "flex w-60 shrink-0 flex-col rounded-xl border bg-muted/30 p-2",
                over === stage.value && "border-primary bg-primary/5"
              )}
            >
              <h3 className="flex items-center justify-between px-1 pb-2 text-sm font-semibold">
                {stage.label}
                <span className="text-xs font-normal text-muted-foreground">{cards.length}</span>
              </h3>
              <div className="flex min-h-16 flex-col gap-2">
                {cards.map((c) => (
                  <article
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className="cursor-grab rounded-lg border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing"
                  >
                    <p className="font-medium">{c.name}</p>
                    {c.property && <p className="truncate text-xs text-muted-foreground">{c.property}</p>}
                    <p className="mt-1 text-xs">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="text-primary hover:underline">
                          {c.phone}
                        </a>
                      ) : (
                        <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                          {c.email}
                        </a>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">{c.when}</span>
                      <label className="sr-only" htmlFor={`stage-${c.id}`}>
                        Stage
                      </label>
                      <select
                        id={`stage-${c.id}`}
                        value={c.stage}
                        onChange={(e) => move(c.id, e.target.value)}
                        className="rounded border bg-background px-1 py-0.5 text-[11px]"
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
