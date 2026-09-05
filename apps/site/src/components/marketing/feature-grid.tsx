import type { LucideIcon } from "lucide-react";

interface FeatureItem {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}

export function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  const colClass =
    columns === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  return (
    <div className={`grid gap-6 ${colClass}`}>
      {items.map(({ icon: Icon, title, description }) => (
        <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
          {Icon && <Icon className="mb-4 h-8 w-8 text-primary" />}
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      ))}
    </div>
  );
}
