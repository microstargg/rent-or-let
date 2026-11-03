"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Staff bell: unread count, recent notifications, mark read. Polls once a minute. */
export function NotificationBell({ align = "left" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    // The shell renders one bell for desktop and one for mobile; only the visible one polls.
    if (panelRef.current && panelRef.current.offsetParent === null) return;
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unread: number; items: NotificationRow[] };
      setItems(data.items);
      setUnread(data.unread);
      setLoaded(true);
    } catch {
      // Offline or signed out: try again on the next tick.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(body: { ids?: string[]; all?: boolean }) {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (body.all || body.ids?.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n))
    );
    setUnread((u) => (body.all ? 0 : Math.max(0, u - (body.ids?.length ?? 0))));
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  }

  function openItem(n: NotificationRow) {
    if (!n.readAt) void markRead({ ids: [n.id] });
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-11 w-11 shrink-0"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          className={cn(
            "z-[60] overflow-hidden rounded-xl border bg-background shadow-xl",
            align === "right"
              ? "fixed inset-x-3 top-16"
              : "absolute left-0 top-12 w-[22rem]"
          )}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => void markRead({ all: true })}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {!loaded ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nothing yet. Jobs assigned to you, tasks due and certificate alerts show up here.
              </p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        !n.readAt && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.readAt ? "bg-transparent" : "bg-primary"
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm", !n.readAt && "font-semibold")}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t px-4 py-2.5 text-right">
            <Link
              href="/settings/notifications"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Email settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
