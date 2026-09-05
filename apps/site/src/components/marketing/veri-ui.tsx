import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function VeriSection({
  children,
  className,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "muted" | "dark";
}) {
  return (
    <section
      className={cn(
        "veri-section",
        tone === "light" && "bg-background",
        tone === "muted" && "bg-muted/50",
        tone === "dark" && "bg-[#141414] text-white",
        className
      )}
    >
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">{children}</div>
    </section>
  );
}

export function VeriHeading({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "font-[family-name:var(--font-veri-sans)] font-bold tracking-tight",
        Tag === "h1" && "text-3xl md:text-5xl",
        Tag === "h2" && "text-2xl md:text-4xl",
        Tag === "h3" && "text-xl md:text-2xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function VeriEm({ children }: { children: ReactNode }) {
  return (
    <em className="font-[family-name:var(--font-veri-serif)] font-normal italic text-[var(--accent)]">
      {children}
    </em>
  );
}

export function VeriPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-foreground/10 bg-card/40 p-6 md:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}
