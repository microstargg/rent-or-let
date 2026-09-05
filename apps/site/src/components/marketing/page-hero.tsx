interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground veri-page-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
      <div className="absolute inset-0 veri-page-hero-media opacity-30" aria-hidden />
      <div className="veri-page-hero-inner container relative mx-auto max-w-6xl px-4 py-16 md:py-20">
        {eyebrow && (
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/75">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/85">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
