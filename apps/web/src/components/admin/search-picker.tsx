"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PickerOption {
  id: string;
  label: string;
  /** Second line, e.g. an email address. */
  hint?: string | null;
}

/**
 * Type-to-filter list for picking one record from many. Shows the first matches only,
 * so it stays fast with hundreds of options.
 */
export function SearchPicker({
  options,
  value,
  onChange,
  placeholder = "Type a name…",
  label,
  emptyText = "Nobody matches.",
  footer,
  limit = 8,
}: {
  options: PickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  label?: string;
  emptyText?: string;
  /** Shown under the matches, e.g. an "Add new renter" button. */
  footer?: React.ReactNode;
  limit?: number;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q))
      : options;
    return list.slice(0, limit);
  }, [options, query, limit]);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
      )}
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        autoComplete="off"
        value={open ? query : (selected?.label ?? query)}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange("");
        }}
        className="mt-1"
      />
      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-sm shadow-md"
        >
          {matches.length ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {matches.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.id === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left hover:bg-muted",
                      o.id === value && "bg-muted font-medium"
                    )}
                  >
                    {o.label}
                    {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-muted-foreground">{emptyText}</p>
          )}
          {footer && <div className="border-t px-3 py-2">{footer}</div>}
        </div>
      )}
    </div>
  );
}
