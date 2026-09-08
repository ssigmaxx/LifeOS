import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RangePreset } from "@/lib/services/analytics-service";

const RANGES: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
];

export function RangeSelector({ current }: { current: RangePreset }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-full bg-muted p-[3px]">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={`/analytics?range=${r.value}`}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            r.value === current
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
