import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoIcon, brandColors } from "@/components/brand/logo-icon";

type SiteLogoProps = {
  className?: string;
  href?: string;
  size?: "sm" | "md";
  showText?: boolean;
};

const sizeStyles = {
  sm: {
    icon: "h-9 w-9",
    line1: "text-[10px]",
    line2: "text-[10px]",
    line3: "text-[8px] tracking-[0.34em]",
    divider: "h-9",
    gap: "gap-2.5",
  },
  md: {
    icon: "h-11 w-11",
    line1: "text-[13px]",
    line2: "text-[13px]",
    line3: "text-[10px] tracking-[0.32em]",
    divider: "h-11",
    gap: "gap-3",
  },
} as const;

export function SiteLogo({
  className,
  href = "/",
  size = "md",
  showText = true,
}: SiteLogoProps) {
  const styles = sizeStyles[size];

  const content = (
    <span className={cn("inline-flex items-center", styles.gap, className)}>
      <LogoIcon className={styles.icon} />
      {showText && (
        <>
          <span
            className={cn("w-px shrink-0", styles.divider)}
            style={{ backgroundColor: brandColors.blue }}
            aria-hidden
          />
          <span className="flex flex-col leading-none">
            <span
              className={cn("font-bold uppercase", styles.line1)}
              style={{ color: brandColors.navy }}
            >
              Property
            </span>
            <span
              className={cn("font-bold uppercase", styles.line2)}
              style={{ color: brandColors.navy }}
            >
              Management
            </span>
            <span
              className={cn("font-medium uppercase", styles.line3)}
              style={{ color: brandColors.blue }}
            >
              Services
            </span>
          </span>
        </>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center hover:opacity-90">
      {content}
    </Link>
  );
}
