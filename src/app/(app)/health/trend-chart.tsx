"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMinutes } from "@/lib/format";

function formatDateShort(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSteps(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : String(value);
}

type Metric = "steps" | "sleep" | "heartRate";

// Formatters live here (inside the client boundary) rather than being
// passed in as props from the server-rendered page — a plain function
// can't cross the server/client component boundary as a prop, only
// serializable values like this metric key can.
const METRIC_CONFIG: Record<Metric, { unitLabel: string; formatValue: (v: number) => string; formatAxis: (v: number) => string }> = {
  steps: { unitLabel: "Steps", formatValue: (v) => v.toLocaleString(), formatAxis: formatSteps },
  sleep: { unitLabel: "Sleep", formatValue: formatMinutes, formatAxis: (v) => `${Math.round(v / 60)}h` },
  heartRate: { unitLabel: "Resting HR", formatValue: (v) => `${v} bpm`, formatAxis: (v) => String(v) },
};

export function TrendChart({
  points,
  metric,
  color,
  emptyMessage = "Not enough synced data yet for a trend.",
}: {
  points: { date: string; value: number | null }[];
  metric: Metric;
  /** CSS color for the bars/line — one metric per chart (no dual axis). */
  color: string;
  emptyMessage?: string;
}) {
  const { unitLabel, formatValue, formatAxis } = METRIC_CONFIG[metric];

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
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatAxis} width={44} />
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
