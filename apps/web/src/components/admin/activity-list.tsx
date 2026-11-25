import type { activityLog } from "@/lib/db/schema";

type Entry = typeof activityLog.$inferSelect;

/** Read-only history: who did what and when. */
export function ActivityList({ entries, empty = "Nothing recorded yet." }: { entries: Entry[]; empty?: string }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ol className="divide-y rounded-xl border bg-card">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
          <span>{e.summary}</span>
          <span className="text-xs text-muted-foreground">
            {e.actorName ?? "System"} ·{" "}
            {e.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
        </li>
      ))}
    </ol>
  );
}
