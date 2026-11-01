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

const RIBBON_RIGHT = "M567 448L690 285C702 268 720 258 740 258H798C803 258 805 263 802 267L594 541C603 527 605 508 600 494Z";
const RIBBON_LEFT = "M415 358H478C494 358 510 368 520 382L600 494C608 507 607 526 596 540C588 550 577 556 565 556C552 556 540 550 532 539L411 366C409 362 411 358 415 358Z";
const RIBBON_SHADOW = "M560 440L640 400L650 470L594 545Z";

/** The three ribbon pieces: back arm, fold shadow, front arm. Fills come from <TickDefs>. */
function RibbonPaths({ dark }: { dark?: boolean }) {
  const set = dark ? "vtd" : "vt";
  return (
    <>
      <path className="vt-r" fill={`url(#${set}-r)`} d={RIBBON_RIGHT} />
      <path className="vt-s" fill={`url(#${set}-s)`} clipPath="url(#vt-c)" d={RIBBON_SHADOW} />
      <path className="vt-l" fill={`url(#${set}-l)`} d={RIBBON_LEFT} />
    </>
  );
}

/**
 * Shared gradients for every ribbon tick on the page, rendered once in the layout.
 * Kept out of display:none so the references resolve in every browser.
 */
export function TickDefs() {
  const grad = (id: string, x1: number, y1: number, x2: number, y2: number, stops: Array<[number, string, number?]>) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([offset, color, opacity]) => (
        <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity ?? 1} />
      ))}
    </linearGradient>
  );
  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {grad("vt-l", 430, 360, 575, 552, [[0, "#3520FD"], [1, "#4A2BFF"]])}
        {grad("vt-r", 590, 520, 790, 262, [[0, "#2010C2"], [0.38, "#2E1BE7"], [0.7, "#3820FC"], [1, "#4026FD"]])}
        {grad("vt-s", 584, 471, 612, 451, [[0, "#10069C"], [0.45, "#10069C", 0.55], [1, "#10069C", 0]])}
        {grad("vtd-l", 430, 360, 575, 552, [[0, "#9C8DFF"], [1, "#B3A8FF"]])}
        {grad("vtd-r", 590, 520, 790, 262, [[0, "#5A44E6"], [0.38, "#6D58F2"], [0.7, "#8170FA"], [1, "#8E7EFF"]])}
        {grad("vtd-s", 584, 471, 612, 451, [[0, "#2B1BA8"], [0.45, "#2B1BA8", 0.6], [1, "#2B1BA8", 0]])}
        {grad("vtk-s", 584, 471, 612, 451, [[0, "#000000", 0.55], [0.45, "#000000", 0.3], [1, "#000000", 0]])}
        <clipPath id="vt-c" clipPathUnits="userSpaceOnUse">
          <path d={RIBBON_RIGHT} />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * The tick the whole Veri site is built around: the logo's folded ribbon.
 * The box variant (buttons, doors) puts the same ribbon into an empty box on hover.
 */
export function Tick({ className, i, drawn, hover, box }: TickProps) {
  const common = {
    "aria-hidden": true,
    focusable: "false" as const,
    "data-static": drawn ? "" : undefined,
    "data-hover": hover ? "" : undefined,
    style: i != null ? ({ "--i": i } as CSSProperties) : undefined,
  };
  if (box) {
    // An empty box with the ribbon tick put into it: the box is a stroke, the tick is the logo's.
    return (
      <span className={cn("v-tick v-tick--box", className)} aria-hidden style={common.style}>
        <svg className="v-tick__box" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
          <rect x="2.5" y="6.5" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth={1.6} />
        </svg>
        <svg
          className="v-tick__mark v-tick--ribbon"
          viewBox="408 254 398 306"
          aria-hidden
          focusable="false"
          data-static={common["data-static"]}
          data-hover={common["data-hover"]}
        >
          <RibbonPaths />
        </svg>
      </span>
    );
  }
  return (
    <svg className={cn("v-tick v-tick--ribbon", className)} viewBox="400 201 412 412" {...common}>
      <RibbonPaths />
    </svg>
  );
}

/** The logo tick: a folded ribbon tick that doubles as the V of Veri. Always in brand colours. */
export function LogoTick({ className }: { className?: string }) {
  return (
    <svg className={cn("v-logo-tick", className)} viewBox="408 254 398 306" aria-hidden focusable="false">
      <RibbonPaths />
    </svg>
  );
}

/** The wordmark: the V of Veri is the ribbon tick. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("v-word", className)} aria-hidden>
      <LogoTick />
      <span className="v-word__eri">eri</span>
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
