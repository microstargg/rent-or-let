import Link from "next/link";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

export { PAGE_SIZE };

interface AdminPaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  /** Base path with existing query string (without page), e.g. /admin/properties?q=foo&status=available */
  baseHref: string;
}

function withPage(baseHref: string, page: number) {
  const hasQuery = baseHref.includes("?");
  if (page <= 1) {
    // strip page if present
    try {
      const url = new URL(baseHref, "http://local");
      url.searchParams.delete("page");
      const qs = url.searchParams.toString();
      return qs ? `${url.pathname}?${qs}` : url.pathname;
    } catch {
      return baseHref;
    }
  }
  try {
    const url = new URL(baseHref, "http://local");
    url.searchParams.set("page", String(page));
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    const sep = hasQuery ? "&" : "?";
    return `${baseHref}${sep}page=${page}`;
  }
}

export function AdminPagination({
  page,
  pageSize = PAGE_SIZE,
  total,
  baseHref,
}: AdminPaginationProps) {
  if (total <= pageSize) {
    if (total === 0) return null;
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Showing {total} {total === 1 ? "result" : "results"}
      </p>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={current <= 1}>
          <Link
            href={withPage(baseHref, current - 1)}
            aria-disabled={current <= 1}
            className={current <= 1 ? "pointer-events-none opacity-50" : undefined}
          >
            Previous
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {current} of {totalPages}
        </span>
        <Button asChild variant="outline" size="sm" disabled={current >= totalPages}>
          <Link
            href={withPage(baseHref, current + 1)}
            aria-disabled={current >= totalPages}
            className={current >= totalPages ? "pointer-events-none opacity-50" : undefined}
          >
            Next
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Build a pathname+query string from search params, omitting page (pagination adds it). */
export function listBaseHref(
  pathname: string,
  params: Record<string, string | undefined | null>
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page") continue;
    if (v != null && v !== "") sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
