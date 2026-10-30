import { cn } from "@/lib/utils";

/** Readable long-form layout for legal pages (the site has no typography plugin). */
export function LegalPage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "container mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed text-muted-foreground",
        "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:text-foreground",
        "[&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6",
        "[&_a]:underline [&_a:hover]:text-primary",
        "[&_table]:mt-4 [&_table]:w-full [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top",
        "[&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground",
        className
      )}
    >
      {children}
    </article>
  );
}
