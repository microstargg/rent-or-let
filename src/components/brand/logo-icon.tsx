import { cn } from "@/lib/utils";

export const brandColors = {
  navy: "#1a2b3c",
  blue: "#3478bf",
} as const;

type LogoIconProps = {
  className?: string;
  title?: string;
};

export function LogoIcon({ className, title = "Property Management Services" }: LogoIconProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d="M10 27.5 28 11.5 46 27.5V44.5H10V27.5Z"
        stroke={brandColors.navy}
        strokeWidth="2.75"
        strokeLinejoin="round"
      />
      <path
        d="M37.5 15.5V21.5H41.5V11.5"
        stroke={brandColors.navy}
        strokeWidth="2.75"
        strokeLinejoin="round"
      />
      <rect
        x="14.5"
        y="32"
        width="8.5"
        height="12.5"
        stroke={brandColors.blue}
        strokeWidth="2.25"
      />
      <rect
        x="32"
        y="30.5"
        width="10"
        height="10"
        stroke={brandColors.navy}
        strokeWidth="2"
      />
      <path d="M37 30.5V40.5" stroke={brandColors.navy} strokeWidth="1.75" />
      <path d="M32 35.5H42" stroke={brandColors.navy} strokeWidth="1.75" />
    </svg>
  );
}
