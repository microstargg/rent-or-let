import { ActionLink } from "./ui";

export function VeriNotFound() {
  return (
    <section className="v-wrap pb-28 pt-16 md:pt-24">
      <p className="v-num text-[var(--v-muted)]">404</p>
      <h1 className="v-display v-display--page mt-4">This line doesn&apos;t add up.</h1>
      <p className="v-lead mt-6">
        The page has moved, or the home has already been let. Everything we have to let is on one page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ActionLink href="/properties">See homes to let</ActionLink>
        <ActionLink href="/" variant="ghost">
          Back to the start
        </ActionLink>
      </div>
    </section>
  );
}
