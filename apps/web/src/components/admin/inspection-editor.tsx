"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ELEMENT_CONDITIONS,
  parseBaselineReport,
  parseInspectionReport,
  type InspectionReport,
} from "@/lib/inspections/report";
import {
  clearDraft,
  compressPhoto,
  deletePendingPhoto,
  listPendingPhotos,
  loadDraft,
  saveDraft,
  savePendingPhoto,
} from "@/lib/inspections/offline-store";

type Room = InspectionReport["rooms"][number];
type Element = Room["elements"][number];

type PhotoTarget =
  | { kind: "element"; room: number; element: number }
  | { kind: "room"; room: number }
  | { kind: "meter"; meter: number };

interface QueuedPhoto {
  id: string;
  target: PhotoTarget;
  file: Blob;
  preview: string;
  status: "waiting" | "uploading" | "failed";
  attempts: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface Draft {
  report: InspectionReport;
  notes: string;
  summary: string;
}

const AUTOSAVE_MS = 1500;
const MAX_ATTEMPTS = 3;

const METERS_TAB = -1;
const FINISH_TAB = -2;

function sameTarget(a: PhotoTarget, b: PhotoTarget) {
  return JSON.stringify(a) === JSON.stringify(b);
}

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
  const [baseline] = useState(() => parseBaselineReport(initialMeta));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [tab, setTab] = useState<number>(() => {
    const firstOpen = report.rooms.findIndex((r) => !r.done);
    return firstOpen >= 0 ? firstOpen : report.rooms.length ? 0 : METERS_TAB;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [restored, setRestored] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const latest = useRef<Draft>({ report, notes, summary });
  latest.current = { report, notes, summary };
  // Bumped on every edit so a save that finishes after a newer edit doesn't mark it saved.
  const version = useRef(0);

  const save = useCallback(
    async (complete = false) => {
      setSaveState("saving");
      const savingVersion = version.current;
      const { report, notes, summary } = latest.current;
      try {
        const res = await fetch(`/api/admin/inspections/${inspectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report, notes, summary, complete }),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveState("saved");
        if (version.current === savingVersion) {
          setDirty(false);
          clearDraft(inspectionId);
        }
        return true;
      } catch {
        setSaveState("error");
        return false;
      }
    },
    [inspectionId]
  );

  // Back every edit up on the device straight away, then autosave shortly after the last one.
  useEffect(() => {
    if (!dirty) return;
    version.current += 1;
    saveDraft(inspectionId, latest.current);
    if (!online) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, report, notes, summary, save, online, inspectionId]);

  // Pick up anything left on this device from a previous visit.
  useEffect(() => {
    const draft = loadDraft<Draft>(inspectionId);
    if (draft) {
      setReport(parseInspectionReport(draft.draft.report));
      setNotes(draft.draft.notes ?? "");
      setSummary(draft.draft.summary ?? "");
      setDirty(true);
      setRestored(true);
    }
    void listPendingPhotos(inspectionId).then((stored) => {
      if (!stored.length) return;
      setQueue((q) => [
        ...q,
        ...stored
          .filter((p) => !q.some((x) => x.id === p.id))
          .map((p) => ({
            id: p.id,
            target: p.target as PhotoTarget,
            file: p.blob,
            preview: URL.createObjectURL(p.blob),
            status: "waiting" as const,
            attempts: 0,
          })),
      ]);
    });
  }, [inspectionId]);

  // Pause while offline; when signal returns, retry failed photos and save pending edits.
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      setQueue((q) => q.map((x) => (x.status === "failed" ? { ...x, status: "waiting", attempts: 0 } : x)));
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    if (!dirty && !queue.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, queue.length]);

  function edit(updater: (current: InspectionReport) => InspectionReport) {
    setReport(updater);
    setDirty(true);
  }

  function updateRoom(index: number, patch: Partial<Room>) {
    edit((current) => ({
      ...current,
      rooms: current.rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    }));
  }

  function updateElement(roomIndex: number, elementIndex: number, patch: Partial<Element>) {
    edit((current) => ({
      ...current,
      rooms: current.rooms.map((room, ri) =>
        ri !== roomIndex
          ? room
          : {
              ...room,
              elements: room.elements.map((el, ei) => (ei === elementIndex ? { ...el, ...patch } : el)),
            }
      ),
    }));
  }

  function addPhotoUrl(target: PhotoTarget, url: string) {
    // Server already stored it; mirror locally so the next autosave keeps it.
    setReport((current) => {
      if (target.kind === "meter") {
        return {
          ...current,
          meters: current.meters.map((m, i) => (i === target.meter ? { ...m, photoUrl: url } : m)),
        };
      }
      return {
        ...current,
        rooms: current.rooms.map((room, ri) => {
          if (ri !== target.room) return room;
          if (target.kind === "room") return { ...room, photoUrls: [...room.photoUrls, url] };
          return {
            ...room,
            elements: room.elements.map((el, ei) =>
              ei === target.element ? { ...el, photoUrls: [...el.photoUrls, url] } : el
            ),
          };
        }),
      };
    });
  }

  function removePhotoUrl(target: PhotoTarget, url: string) {
    if (target.kind === "meter") {
      edit((current) => ({
        ...current,
        meters: current.meters.map((m, i) => (i === target.meter ? { ...m, photoUrl: "" } : m)),
      }));
    } else if (target.kind === "room") {
      updateRoom(target.room, {
        photoUrls: report.rooms[target.room]!.photoUrls.filter((u) => u !== url),
      });
    } else {
      const el = report.rooms[target.room]!.elements[target.element]!;
      updateElement(target.room, target.element, { photoUrls: el.photoUrls.filter((u) => u !== url) });
    }
  }

  function enqueue(target: PhotoTarget, files: FileList | null) {
    if (!files?.length) return;
    const items: QueuedPhoto[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      target,
      file,
      preview: URL.createObjectURL(file),
      status: "waiting",
      attempts: 0,
    }));
    setQueue((q) => [...q, ...items]);
    for (const item of items) {
      void savePendingPhoto({
        id: item.id,
        inspectionId,
        target: item.target,
        blob: item.file,
        name: "photo.jpg",
        createdAt: Date.now(),
      });
    }
  }

  // One upload at a time, retrying with backoff, so a weak signal doesn't drop photos.
  const active = queue.find((q) => q.status === "uploading");
  const next = queue.find((q) => q.status === "waiting");
  useEffect(() => {
    if (active || !next || !online) return;
    const item = next;
    setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, status: "uploading" } : x)));
    void (async () => {
      const delay = item.attempts ? 1000 * 2 ** (item.attempts - 1) : 0;
      if (delay) await new Promise((r) => setTimeout(r, delay));
      try {
        const photo = await compressPhoto(item.file);
        const form = new FormData();
        form.set("file", photo, photo.type === "image/jpeg" ? "photo.jpg" : "photo");
        form.set("target", item.target.kind);
        if ("room" in item.target) form.set("room", String(item.target.room));
        if (item.target.kind === "element") form.set("element", String(item.target.element));
        if (item.target.kind === "meter") form.set("meter", String(item.target.meter));
        const res = await fetch(`/api/admin/inspections/${inspectionId}`, { method: "PATCH", body: form });
        const doc = await res.json().catch(() => ({}));
        if (!res.ok || !doc.url) throw new Error(doc.error ?? "upload failed");
        addPhotoUrl(item.target, doc.url);
        void deletePendingPhoto(item.id);
        URL.revokeObjectURL(item.preview);
        setQueue((q) => q.filter((x) => x.id !== item.id));
      } catch {
        // Dropped signal isn't the photo's fault: wait for "online" instead of using up retries.
        const attempts = navigator.onLine ? item.attempts + 1 : item.attempts;
        setQueue((q) =>
          q.map((x) =>
            x.id === item.id
              ? { ...x, attempts, status: attempts >= MAX_ATTEMPTS ? "failed" : "waiting" }
              : x
          )
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, next?.id, online]);

  function retry(id: string) {
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, status: "waiting", attempts: 0 } : x)));
  }

  function discard(id: string) {
    setQueue((q) => {
      const item = q.find((x) => x.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      void deletePendingPhoto(id);
      return q.filter((x) => x.id !== id);
    });
  }

  async function finishRoom(index: number) {
    updateRoom(index, { done: true });
    latest.current.report = {
      ...latest.current.report,
      rooms: latest.current.report.rooms.map((r, i) => (i === index ? { ...r, done: true } : r)),
    };
    await save();
    const nextOpen = report.rooms.findIndex((r, i) => i > index && !r.done);
    setTab(nextOpen >= 0 ? nextOpen : METERS_TAB);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addRoom() {
    const index = report.rooms.length;
    edit((current) => ({
      ...current,
      rooms: [
        ...current.rooms,
        { name: `Room ${index + 1}`, notes: "", photoUrls: [], done: false, elements: [] },
      ],
    }));
    setTab(index);
  }

  function removeRoom(index: number) {
    if (!window.confirm(`Remove ${report.rooms[index]?.name ?? "this room"} and its photos?`)) return;
    edit((current) => ({ ...current, rooms: current.rooms.filter((_, i) => i !== index) }));
    setTab(Math.max(0, index - 1));
  }

  async function complete() {
    setMessage(null);
    const ok = await save(true);
    setMessage(ok ? "Inspection completed" : "Could not complete — check your connection and try again");
    if (ok) router.refresh();
  }

  const uploadsBusy = queue.some((q) => q.status !== "failed");
  const doneCount = report.rooms.filter((r) => r.done).length;
  const room = tab >= 0 ? report.rooms[tab] : undefined;
  const baselineRoom = room ? baseline?.rooms.find((r) => r.name === room.name) : undefined;

  function pendingFor(target: PhotoTarget) {
    return queue.filter((q) => sameTarget(q.target, target));
  }

  function photoStrip(target: PhotoTarget, urls: string[]) {
    const pending = pendingFor(target);
    if (!urls.length && !pending.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-20 w-20 rounded-md border object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs shadow"
              onClick={() => removePhotoUrl(target, url)}
            >
              ×
            </button>
          </div>
        ))}
        {pending.map((item) => (
          <div key={item.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.preview}
              alt=""
              className={`h-20 w-20 rounded-md border object-cover ${item.status === "failed" ? "opacity-40" : "opacity-60"}`}
            />
            <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 px-1 text-center text-[10px] text-white">
              {item.status === "failed" ? "Failed" : item.status === "uploading" ? "Uploading…" : "Waiting"}
            </span>
            {item.status === "failed" && (
              <div className="mt-1 flex gap-1 text-xs">
                <button type="button" className="text-primary underline" onClick={() => retry(item.id)}>
                  Retry
                </button>
                <button type="button" className="text-muted-foreground underline" onClick={() => discard(item.id)}>
                  Drop
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function photoButtons(target: PhotoTarget, single = false) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">
          Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              enqueue(target, e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">
          {single ? "Choose photo" : "Add from library"}
          <input
            type="file"
            accept="image/*"
            multiple={!single}
            className="sr-only"
            onChange={(e) => {
              enqueue(target, e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  const tabButton = (value: number, label: string, done?: boolean) => (
    <button
      key={value}
      type="button"
      onClick={() => setTab(value)}
      className={`min-h-10 shrink-0 rounded-full border px-3 text-sm ${
        tab === value ? "border-primary bg-primary text-primary-foreground" : "bg-background"
      }`}
    >
      {done ? "✓ " : ""}
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div ref={topRef} className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium">
            {doneCount} of {report.rooms.length} rooms done
          </span>
          <span className="text-muted-foreground">
            {!online && "Offline — everything is kept on this device and will upload when you're back online · "}
            {queue.length > 0 &&
              `${queue.filter((q) => q.status !== "failed").length} photo(s) uploading · `}
            {queue.some((q) => q.status === "failed") && "some photos failed · "}
            {saveState === "saving"
              ? "Saving…"
              : saveState === "error"
                ? "Not saved — will retry"
                : dirty
                  ? "Unsaved changes"
                  : saveState === "saved"
                    ? "All changes saved"
                    : ""}
          </span>
        </div>
        {restored && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            Restored changes that hadn&apos;t been saved from this device.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                clearDraft(inspectionId);
                window.location.reload();
              }}
            >
              Discard them
            </button>
          </p>
        )}
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {report.rooms.map((r, i) => tabButton(i, r.name, r.done))}
          <button
            type="button"
            onClick={addRoom}
            className="min-h-10 shrink-0 rounded-full border border-dashed px-3 text-sm text-muted-foreground"
          >
            + Room
          </button>
          {tabButton(METERS_TAB, "Meters")}
          {tabButton(FINISH_TAB, "Finish")}
        </div>
      </div>

      {room && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="room-name">Room</Label>
              <Input
                id="room-name"
                className="mt-1.5 min-h-11"
                value={room.name}
                onChange={(e) => updateRoom(tab, { name: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-red-700"
              disabled={uploadsBusy}
              onClick={() => removeRoom(tab)}
            >
              Remove room
            </Button>
          </div>

          <div>
            <Label htmlFor="room-notes">Room notes</Label>
            <Textarea
              id="room-notes"
              className="mt-1.5"
              rows={2}
              value={room.notes}
              onChange={(e) => updateRoom(tab, { notes: e.target.value })}
            />
            <p className="mt-3 text-sm font-medium">Overview photos</p>
            {photoStrip({ kind: "room", room: tab }, room.photoUrls)}
            {photoButtons({ kind: "room", room: tab })}
          </div>

          {room.elements.map((el, ei) => {
            const prev = baselineRoom?.elements.find((e) => e.name === el.name);
            const target: PhotoTarget = { kind: "element", room: tab, element: ei };
            return (
              <div key={ei} className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Item name"
                    className="min-h-11 flex-1 font-medium"
                    value={el.name}
                    onChange={(e) => updateElement(tab, ei, { name: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${el.name}`}
                    disabled={uploadsBusy}
                    onClick={() =>
                      updateRoom(tab, { elements: room.elements.filter((_, idx) => idx !== ei) })
                    }
                  >
                    ×
                  </Button>
                </div>
                {prev && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    At check-in: <span className="capitalize">{prev.condition}</span>
                    {prev.notes ? ` — ${prev.notes}` : ""}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ELEMENT_CONDITIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateElement(tab, ei, { condition: c })}
                      className={`min-h-10 rounded-md border px-3 text-sm capitalize ${
                        el.condition === c ? "border-primary bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Input
                  className="mt-3 min-h-11"
                  placeholder="Notes"
                  value={el.notes}
                  onChange={(e) => updateElement(tab, ei, { notes: e.target.value })}
                />
                {photoStrip(target, el.photoUrls)}
                {photoButtons(target)}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() =>
              updateRoom(tab, {
                elements: [...room.elements, { name: "New item", condition: "good", notes: "", photoUrls: [] }],
              })
            }
          >
            + Add item
          </Button>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" className="min-h-11 flex-1 sm:flex-none" onClick={() => finishRoom(tab)}>
              {room.done ? "Save and next room" : "Done — next room"}
            </Button>
            {room.done && (
              <Button type="button" variant="outline" className="min-h-11" onClick={() => updateRoom(tab, { done: false })}>
                Reopen room
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === METERS_TAB && (
        <div className="space-y-4">
          {report.meters.map((meter, i) => {
            const prev = baseline?.meters.find((m) => m.type === meter.type);
            return (
              <div key={meter.type} className="rounded-xl border p-4">
                <Label htmlFor={`meter-${i}`} className="capitalize">
                  {meter.type}
                </Label>
                {prev?.reading && (
                  <p className="mt-1 text-xs text-muted-foreground">At check-in: {prev.reading}</p>
                )}
                <Input
                  id={`meter-${i}`}
                  className="mt-1.5 min-h-11"
                  inputMode="decimal"
                  value={meter.reading}
                  onChange={(e) =>
                    edit((current) => ({
                      ...current,
                      meters: current.meters.map((m, idx) => (idx === i ? { ...m, reading: e.target.value } : m)),
                    }))
                  }
                />
                {photoStrip({ kind: "meter", meter: i }, meter.photoUrl ? [meter.photoUrl] : [])}
                {photoButtons({ kind: "meter", meter: i }, true)}
              </div>
            );
          })}
          <Button type="button" className="min-h-11" onClick={() => setTab(FINISH_TAB)}>
            Next — finish
          </Button>
        </div>
      )}

      {tab === FINISH_TAB && (
        <div className="space-y-4">
          {doneCount < report.rooms.length && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Not marked done yet:{" "}
              {report.rooms
                .filter((r) => !r.done)
                .map((r) => r.name)
                .join(", ")}
            </p>
          )}
          <div>
            <Label htmlFor="insp-summary">Summary</Label>
            <Input
              id="insp-summary"
              className="mt-1.5 min-h-11"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div>
            <Label htmlFor="insp-notes">Notes</Label>
            <Textarea
              id="insp-notes"
              className="mt-1.5"
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={saveState === "saving"} onClick={() => save()}>
              Save now
            </Button>
            {!completed && (
              <Button type="button" className="min-h-11" disabled={saveState === "saving" || uploadsBusy} onClick={complete}>
                {uploadsBusy ? "Waiting for photos…" : "Complete inspection"}
              </Button>
            )}
            <Button asChild variant="secondary" className="min-h-11">
              <a href={`/api/inspections/${inspectionId}/pdf`} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}
