"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warning" | "danger" | "success";

export interface PropertyTab {
  id: string;
  label: string;
  /** Small number after the label, e.g. open repairs. Hidden when 0 or undefined. */
  count?: number;
  /** Colours the count when it needs attention. */
  countTone?: Tone;
  content: React.ReactNode;
}

export interface PropertySummaryCard {
  label: string;
  value: string;
  hint?: string;
  tone: Tone;
  /** Tab to open when the card is pressed. */
  tab: string;
}

const CARD_TONES: Record<Tone, string> = {
  neutral: "border-border bg-card",
  warning: "border-amber-200 bg-amber-50/60",
  danger: "border-red-200 bg-red-50/60",
  success: "border-emerald-200 bg-emerald-50/60",
};

const COUNT_TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  success: "bg-emerald-100 text-emerald-800",
};

/**
 * Summary cards plus tabs for the property page. Every tab is rendered on the server and
 * kept mounted, so switching is instant and unsaved edits in the listing form survive.
 * The open tab is kept in `?tab=` so links and refreshes land on the same tab.
 */
export function PropertyTabs({
  tabs,
  summary,
  initialTab,
}: {
  tabs: PropertyTab[];
  summary: PropertySummaryCard[];
  initialTab?: string;
}) {
  const fallback = tabs[0]?.id ?? "";
  const [active, setActive] = useState(
    initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : fallback
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelTop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (active === fallback) url.searchParams.delete("tab");
    else url.searchParams.set("tab", active);
    window.history.replaceState(window.history.state, "", url);
    tabRefs.current[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, fallback]);

  function open(id: string, scroll = false) {
    setActive(id);
    if (scroll) {
      requestAnimationFrame(() => panelTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <div>
      {summary.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => open(card.tab, true)}
              className={cn(
                "min-w-0 rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                CARD_TONES[card.tone]
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">{card.value}</p>
              {card.hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.hint}</p>}
            </button>
          ))}
        </div>
      )}

      <div ref={panelTop} className="scroll-mt-4" />
      <div
        role="tablist"
        aria-label="Property sections"
        className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => open(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                selected
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {Boolean(tab.count) && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
                    COUNT_TONES[tab.countTone ?? "neutral"]
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-2"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
