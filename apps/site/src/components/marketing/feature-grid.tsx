import type { LucideIcon } from "lucide-react";
import { getTenant } from "@/lib/tenant";
import { isVeriAgency } from "@/lib/veri";
import { cn } from "@/lib/utils";

interface FeatureItem {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}

export async function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  const { id } = await getTenant();
  const isVeri = isVeriAgency(id);
  const colClass =
    columns === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  return (
    <div className={cn("grid gap-6", isVeri ? "gap-10" : "gap-6", colClass)}>
      {items.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className={
            isVeri
              ? "border-b border-foreground/10 pb-6"
              : "rounded-xl border bg-card p-6 shadow-sm"
          }
        >
          {Icon && (
            <Icon
              className={cn(
                "mb-4 h-8 w-8",
                isVeri ? "h-7 w-7 text-[oklch(0.55_0.08_55)]" : "text-primary"
              )}
            />
          )}
          <h3
            className={cn(
              "font-semibold",
              isVeri && "font-[family-name:var(--font-veri-sans)] text-lg"
            )}
          >
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}
