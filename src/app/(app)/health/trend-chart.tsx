"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatDateShort(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({
  points,
  color,
  unitLabel,
  formatValue,
  formatAxis,
  emptyMessage = "Not enough synced data yet for a trend.",
}: {
  points: { date: string; value: number | null }[];
  /** CSS color for the bars/line — one metric per chart (no dual axis). */
  color: string;
  /** Series name shown in the tooltip, e.g. "Steps", "Sleep", "Resting HR". */
  unitLabel: string;
  /** Full value for the tooltip, e.g. "10,610" or "6h 24m". */
  formatValue: (value: number) => string;
  /** Compact value for the Y axis ticks — defaults to the raw number. */
  formatAxis?: (value: number) => string;
  emptyMessage?: string;
}) {
  const hasData = points.some((p) => p.value != null);
  if (!hasData) {
    return <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  // A 7-day rolling average smooths out day-to-day noise so the trend
  // reads clearly against the raw daily bars underneath it.
  const data = points.map((point, i) => {
    const window = points.slice(Math.max(0, i - 6), i + 1);
    const values = window.map((p) => p.value).filter((v): v is number => v != null);
    const rollingAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { date: point.date, label: formatDateShort(point.date), value: point.value, rollingAvg };
  });

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis ?? String} width={44} />
          <Tooltip
            labelFormatter={(label) => label}
            formatter={(value, name) => [
              formatValue(Number(value)),
              name === "value" ? unitLabel : "7-day average",
            ]}
          />
          <Bar dataKey="value" name="value" fill={color} fillOpacity={0.28} radius={[4, 4, 0, 0]} />
          <Line
            dataKey="rollingAvg"
            name="rollingAvg"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            type="monotone"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
