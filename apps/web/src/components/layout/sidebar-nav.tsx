"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
}

export interface SidebarNavSection {
  label?: string;
  items: SidebarNavItem[];
}

function isActive(pathname: string, item: SidebarNavItem) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: SidebarNavSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5 px-2 pb-4">
      {sections.map((section, idx) => (
        <div key={section.label ?? `top-${idx}`}>
          {section.label && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
