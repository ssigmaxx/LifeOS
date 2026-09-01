import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pure SVG, no interactivity — stays a server component so it doesn't add
// to the client bundle. The hero "today's score" replaces a thin bar with
// this ring on Dashboard/Today: a bigger, more graphical focal point while
// still being exactly one shape, no extra chrome.
export function RadialProgress({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  children,
}: {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
