import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TickProps = {
  className?: string;
  /** Position in a staggered group (each step waits 70 ms). */
  i?: number;
  /** Always drawn (wordmark, current page). */
  drawn?: boolean;
  /** Drawn only while its `.v-hover` parent is hovered or focused. */
  hover?: boolean;
  /** Sit the tick in an empty box, so the hover reads as ticking it off. */
  box?: boolean;
};

/** A ballpoint tick: the one mark the whole Veri site is built around. */
export function Tick({ className, i, drawn, hover, box }: TickProps) {
  return (
    <svg
      className={cn("v-tick", box && "v-tick--box", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      data-static={drawn ? "" : undefined}
      data-hover={hover ? "" : undefined}
      style={i != null ? ({ "--i": i } as CSSProperties) : undefined}
    >
      {box ? (
        <rect x="2.5" y="6.5" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth={1.6} />
      ) : null}
      <path
        d={box ? "M5.6 13.4c1.5.9 2.8 2.2 3.8 3.8C12.3 11.6 16.3 6.9 22 3" : "M3.4 13.3c2.2 1.3 4 3.1 5.5 5.4C11.7 12.5 15.7 7.6 21 4"}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The wordmark: the V of Veri is the tick. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("v-word", className)} aria-hidden>
      <Tick drawn />
      eri
    </span>
  );
}

/** A line on a statement: label, dotted leader, amount, optional note. */
export function Line({
  label,
  amount,
  note,
  i,
  tick = true,
  total,
  className,
}: {
  label: ReactNode;
  amount?: ReactNode;
  note?: ReactNode;
  i?: number;
  tick?: boolean;
  total?: boolean;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "v-line",
        !tick && "v-line--plain",
        amount == null && "v-line--noamt",
        total && "v-line--total",
        className
      )}
    >
      {tick ? <Tick i={i} /> : null}
      <span className="v-line__label">{label}</span>
      {amount != null ? (
        <>
          <span className="v-line__dots" aria-hidden />
          <span className="v-line__amt v-num">{amount}</span>
        </>
      ) : null}
      {note ? <span className="v-line__note">{note}</span> : null}
    </li>
  );
}

/** A ticked list: each item is checked off as the list scrolls into view. */
export function TickList({
  items,
  className,
}: {
  items: ReactNode[];
  className?: string;
}) {
  return (
    <ul className={cn("v-ticklist", className)} data-tick>
      {items.map((item, index) => (
        <li key={index}>
          <Tick i={index} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Type-led head for inner pages. */
export function PageHead({
  title,
  lead,
  aside,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--v-line)]">
      <div className="v-wrap v-grid gap-y-8 pb-12 pt-12 md:pb-16 md:pt-20">
        <h1 className="v-display v-display--page col-span-12">{title}</h1>
        <div className={cn("col-span-12", aside ? "lg:col-span-6" : "lg:col-span-8")}>
          {lead ? <p className="v-lead">{lead}</p> : null}
          {children}
        </div>
        {aside ? (
          <div className="col-span-12 lg:col-span-5 lg:col-start-8 lg:self-end">{aside}</div>
        ) : null}
      </div>
    </header>
  );
}

/** Primary action: ticks itself on hover. */
export function ActionLink({
  href,
  children,
  variant,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: "pen" | "ghost";
  className?: string;
  external?: boolean;
}) {
  const classes = cn("v-btn v-hover", variant && `v-btn--${variant}`, className);
  const content = (
    <>
      <Tick hover box />
      {children}
    </>
  );
  if (external || href.startsWith("mailto:") || href.startsWith("http")) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
