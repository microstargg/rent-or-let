"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useOptionalTenant } from "@repo/config";
import { Button } from "@/components/ui/button";

/** Friendly fallback when a page can't load (usually the platform API being unreachable). */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const contact = useOptionalTenant()?.site.contact;
  const phone = contact?.phone;
  const email = contact?.email;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-xl px-4 py-24 text-center md:py-32">
      <h1 className="text-3xl font-bold">We couldn&apos;t load this page</h1>
      <p className="mt-4 text-muted-foreground">
        Something went wrong on our side. Please try again in a moment
        {phone || email ? ", or contact us " : ""}
        {phone ? (
          <>
            on{" "}
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium text-primary">
              {phone}
            </a>
          </>
        ) : email ? (
          <>
            at{" "}
            <a href={`mailto:${email}`} className="font-medium text-primary">
              {email}
            </a>
          </>
        ) : null}
        .
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
