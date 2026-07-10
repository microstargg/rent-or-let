"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChipOption {
  value: string;
  label: string;
}

export interface SortOption {
  value: string;
  label: string;
}

interface AdminListToolbarProps {
  searchPlaceholder?: string;
  statusParam?: string;
  statusOptions?: FilterChipOption[];
  /** Status applied when the URL omits the param (e.g. tenancies default to active). */
  defaultStatus?: string;
  includeAllStatus?: boolean;
  allStatusLabel?: string;
  /** Value used for the All chip when a defaultStatus is set (stored in URL). */
  allStatusValue?: string;
  sortOptions?: SortOption[];
  defaultSort?: string;
}

function buildHref(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null>
) {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function AdminListToolbar({
  searchPlaceholder = "Search…",
  statusParam = "status",
  statusOptions,
  defaultStatus,
  includeAllStatus = true,
  allStatusLabel = "All",
  allStatusValue = "all",
  sortOptions,
  defaultSort,
}: AdminListToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const qFromUrl = searchParams.get("q") ?? "";
  const [q, setQ] = useState(qFromUrl);

  useEffect(() => {
    setQ(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (q === qFromUrl) return;
    const handle = setTimeout(() => {
      startTransition(() => {
        router.push(
          buildHref(pathname, searchParams, {
            q: q.trim() || null,
            page: null,
          })
        );
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [q, qFromUrl, pathname, router, searchParams]);

  const activeStatus = searchParams.get(statusParam);
  const activeSort = searchParams.get("sort") ?? defaultSort ?? "";
  const page = searchParams.get("page");

  const statusIsFiltered = defaultStatus
    ? activeStatus !== null && activeStatus !== defaultStatus
    : Boolean(activeStatus);

  const sortIsFiltered = Boolean(
    searchParams.get("sort") && searchParams.get("sort") !== defaultSort
  );

  const clearVisible =
    Boolean(qFromUrl) || statusIsFiltered || sortIsFiltered || Boolean(page && page !== "1");

  const effectiveStatus = activeStatus ?? defaultStatus ?? "";

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      router.push(
        buildHref(pathname, searchParams, {
          q: q.trim() || null,
          page: null,
        })
      );
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSearchSubmit} className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-sm"
          aria-label="Search"
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        {sortOptions && sortOptions.length > 0 && (
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={activeSort}
            aria-label="Sort by"
            onChange={(e) => {
              const value = e.target.value;
              startTransition(() => {
                router.push(
                  buildHref(pathname, searchParams, {
                    sort: value === defaultSort ? null : value || null,
                    page: null,
                  })
                );
              });
            }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {clearVisible && (
          <Button asChild variant="ghost" size="sm">
            <Link href={pathname}>Clear filters</Link>
          </Button>
        )}
      </form>

      {statusOptions && statusOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {includeAllStatus && (
            <FilterChip
              href={buildHref(pathname, searchParams, {
                [statusParam]: defaultStatus ? allStatusValue : null,
                page: null,
              })}
              label={allStatusLabel}
              active={
                defaultStatus ? activeStatus === allStatusValue : !activeStatus
              }
            />
          )}
          {statusOptions.map((opt) => {
            const isDefault = Boolean(defaultStatus && opt.value === defaultStatus);
            return (
              <FilterChip
                key={opt.value}
                href={buildHref(pathname, searchParams, {
                  [statusParam]: isDefault ? null : opt.value,
                  page: null,
                })}
                label={opt.label}
                active={
                  defaultStatus
                    ? effectiveStatus === opt.value && activeStatus !== allStatusValue
                    : activeStatus === opt.value
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm capitalize transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
