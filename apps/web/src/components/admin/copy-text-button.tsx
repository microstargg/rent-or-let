"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyTextButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Click to copy"
      className={cn(
        "text-left text-sm text-muted-foreground hover:text-foreground hover:underline",
        className
      )}
    >
      {copied ? "Copied" : value}
    </button>
  );
}
