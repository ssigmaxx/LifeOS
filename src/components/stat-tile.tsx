import { cn } from "@/lib/utils";

export type StatTileData = {
  label: string;
  value: string;
  /** Secondary line — a plain caption, or a directional delta (set `trend`). */
  hint?: string;
  trend?: "up" | "down";
  /** Meaning of the trend for *this* metric — up isn't always good (e.g. CO2e). */
  tone?: "good" | "bad" | "caution" | "neutral";
};

const TONE_CLASSES: Record<NonNullable<StatTileData["tone"]>, string> = {
  good: "text-foreground",
  bad: "text-destructive",
  caution: "text-warning",
  neutral: "text-muted-foreground",
};

function Triangle({ direction }: { direction: "up" | "down" }) {
  return (
    <span
      className={cn(
        "inline-block size-0 border-x-[3.5px] border-x-transparent",
        direction === "up" ? "border-b-[5px]" : "border-t-[5px]",
      )}
      style={{ borderBottomColor: direction === "up" ? "currentColor" : undefined, borderTopColor: direction === "down" ? "currentColor" : undefined }}
      aria-hidden
    />
  );
}

function StatTile({ label, value, hint, trend, tone = "neutral" }: StatTileData) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? (
        <p className={cn("mt-1 flex items-center gap-1 text-xs", TONE_CLASSES[tone])}>
          {trend ? <Triangle direction={trend} /> : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function StatTileRow({ tiles, className }: { tiles: StatTileData[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {tiles.map((tile) => (
        <StatTile key={tile.label} {...tile} />
      ))}
    </div>
  );
}
