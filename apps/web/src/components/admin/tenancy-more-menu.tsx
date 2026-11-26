"use client";

import { useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { TenancyEndButton } from "@/components/admin/tenancy-end-button";

/**
 * Rare and serious actions for a tenancy (ending it, possession notices) live behind
 * "More" so they aren't the loudest buttons on the page.
 */
export function TenancyMoreMenu({
  tenancyId,
  active,
  ledgerHref,
}: {
  tenancyId: string;
  active: boolean;
  ledgerHref: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        More
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-60 rounded-md border bg-popover p-1 text-sm shadow-md">
        <a href={ledgerHref} className="block rounded px-3 py-2 hover:bg-muted">
          Download rent account (PDF)
        </a>
        {/* A full load, so the Notices tab opens with the form showing. */}
        <a href={`/tenancies/${tenancyId}?tab=notices&serve=section8`} className="block rounded px-3 py-2 hover:bg-muted">
          Serve Section 8 notice
        </a>
        {active && (
          <div className="border-t px-2 pt-2 pb-1">
            <TenancyEndButton id={tenancyId} />
          </div>
        )}
      </div>
    </details>
  );
}
