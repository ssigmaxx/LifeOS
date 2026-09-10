import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RingData = {
  label: string;
  /** 0-1 */
  value: number;
  valueLabel: string;
};

// Concentric progress rings (outer = first entry), for glancing at a couple
// of related "actual vs. target" metrics at once — a multi-metric sibling
// to RadialProgress, which stays the single-ring case (Today/Recap score).
const RING_COLORS = [
  "var(--foreground)",
  "color-mix(in oklab, var(--foreground) 65%, var(--card))",
  "color-mix(in oklab, var(--foreground) 40%, var(--card))",
];

export function RingCluster({
  rings,
  size = 112,
  strokeWidth = 9,
  gap = 4,
  centerValue,
  centerLabel,
  className,
  colors = RING_COLORS,
}: {
  rings: RingData[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  centerValue?: ReactNode;
  centerLabel?: ReactNode;
  className?: string;
  /** Per-ring stroke colors, outer ring first. Defaults to the grayscale ramp. */
  colors?: string[];
}) {
  const center = size / 2;
  const maxRadius = center - strokeWidth / 2;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {rings.map((ring, i) => {
          const radius = maxRadius - i * (strokeWidth + gap);
          const circumference = 2 * Math.PI * radius;
          const clamped = Math.min(Math.max(ring.value, 0), 1);
          const offset = circumference * (1 - clamped);
          return (
            <g key={ring.label}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                className="stroke-border"
              />
              <circle
                cx={center}
                cy={center}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
                stroke={colors[i % colors.length]}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </g>
          );
        })}
      </svg>
      {centerValue || centerLabel ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue ? <span className="text-lg font-semibold tracking-tight">{centerValue}</span> : null}
          {centerLabel ? <span className="text-[10px] text-muted-foreground">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function RingLegend({ rings, colors = RING_COLORS }: { rings: RingData[]; colors?: string[] }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {rings.map((ring, i) => (
        <div key={ring.label} className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
          <span className="font-medium">{ring.label}</span>
          <span className="ml-auto pl-2 text-xs text-muted-foreground tabular-nums">{ring.valueLabel}</span>
        </div>
      ))}
    </div>
  );
}
