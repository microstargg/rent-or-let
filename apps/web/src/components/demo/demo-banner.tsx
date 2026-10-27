import Link from "next/link";

/** Thin strip on every demo page so nobody mistakes the sample data for a live agency. */
export function DemoBanner() {
  return (
    <div className="bg-primary px-4 py-1.5 text-center text-xs text-primary-foreground">
      You are viewing the LetFlow demo. All names and figures are fictional and reset every night.{" "}
      <Link href="/login" className="underline underline-offset-2">
        Switch role
      </Link>
    </div>
  );
}
