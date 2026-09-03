"use client";

import Link from "next/link";
import { useTenant } from "@repo/config";
import { cn } from "@/lib/utils";
import { LogoIcon, useBrandColors } from "@/components/brand/logo-icon";

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
  const tenant = useTenant();
  const brandColors = useBrandColors();
  const styles = sizeStyles[size];
  const [line1, line2, line3] = tenant.logo.lines;

  const content = (
    <span className={cn("inline-flex items-center", styles.gap, className)}>
      <LogoIcon className={styles.icon} />
      {showText && (line1 || line2 || line3) && (
        <>
          <span
            className={cn("w-px shrink-0", styles.divider)}
            style={{ backgroundColor: brandColors.blue }}
            aria-hidden
          />
          <span className="flex flex-col leading-none">
            {line1 ? (
              <span
                className={cn("font-bold uppercase", styles.line1)}
                style={{ color: brandColors.navy }}
              >
                {line1}
              </span>
            ) : null}
            {line2 ? (
              <span
                className={cn("font-bold uppercase", styles.line2)}
                style={{ color: brandColors.navy }}
              >
                {line2}
              </span>
            ) : null}
            {line3 ? (
              <span
                className={cn("font-medium uppercase", styles.line3)}
                style={{ color: brandColors.blue }}
              >
                {line3}
              </span>
            ) : null}
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
