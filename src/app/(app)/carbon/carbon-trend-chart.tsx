"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CarbonDailyPoint } from "@/lib/carbon-summary";

const SERIES: { key: "food" | "travel" | "energy" | "shopping"; label: string; color: string }[] = [
  { key: "food", label: "Food", color: "var(--chart-1)" },
  { key: "travel", label: "Travel", color: "var(--chart-2)" },
  { key: "energy", label: "Energy", color: "var(--chart-3)" },
  { key: "shopping", label: "Shopping", color: "var(--chart-4)" },
];

function formatDateShort(dateISO: string) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CarbonTrendChart({ series }: { series: CarbonDailyPoint[] }) {
  const hasAnyData = series.some((p) => p.food + p.travel + p.energy + p.shopping > 0);
  if (!hasAnyData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No activity logged in this range yet.
      </div>
    );
  }

  const data = series.map((p) => ({ ...p, label: formatDateShort(p.date) }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}kg`} />
          <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)} kg`, name]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="co2e" fill={s.color} radius={0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
