"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyScorePoint } from "@/lib/services/analytics-service";

function formatDateShort(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ScoreTrendChart({ series }: { series: DailyScorePoint[] }) {
  const data = series.map((p) => ({
    date: p.date,
    label: formatDateShort(p.date),
    score: p.score != null ? Math.round(p.score * 100) : null,
  }));

  const hasAnyScore = data.some((d) => d.score != null);
  if (!hasAnyScore) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No habit data in this range yet.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value) => [`${value}%`, "Score"]}
            labelFormatter={(label) => label}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
