"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatDateShort(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSteps(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : String(value);
}

export function WeeklyTrendChart({ points }: { points: { date: string; steps: number | null }[] }) {
  const hasData = points.some((p) => p.steps != null);
  if (!hasData) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        Not enough synced data yet for a trend.
      </div>
    );
  }

  // A 7-day rolling average smooths out day-to-day noise so the trend
  // reads clearly against the raw daily bars underneath it.
  const data = points.map((point, i) => {
    const window = points.slice(Math.max(0, i - 6), i + 1);
    const values = window.map((p) => p.steps).filter((v): v is number => v != null);
    const rollingAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    return { date: point.date, label: formatDateShort(point.date), steps: point.steps, rollingAvg };
  });

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatSteps} width={40} />
          <Tooltip
            labelFormatter={(label) => label}
            formatter={(value, name) => [Number(value).toLocaleString(), name === "steps" ? "Steps" : "7-day average"]}
          />
          <Bar dataKey="steps" name="steps" fill="var(--health-steps)" fillOpacity={0.28} radius={[4, 4, 0, 0]} />
          <Line
            dataKey="rollingAvg"
            name="rollingAvg"
            stroke="var(--health-steps)"
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
