"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame } from "lucide-react";
import type { HabitAnalytics } from "@/lib/services/analytics-service";

export function HabitComparison({ habits }: { habits: HabitAnalytics[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(habits.slice(0, Math.min(4, habits.length)).map((h) => h.id)),
  );

  if (habits.length === 0) {
    return <p className="text-sm text-muted-foreground">No habits to compare yet.</p>;
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedHabits = habits.filter((h) => selected.has(h.id));
  const chartData = selectedHabits.map((h) => ({
    name: h.name.length > 12 ? `${h.name.slice(0, 12)}…` : h.name,
    completion: Math.round(h.completionRate * 100),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {habits.map((h) => (
          <label key={h.id} className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={selected.has(h.id)} onCheckedChange={() => toggle(h.id)} />
            {h.icon ? <span>{h.icon}</span> : null}
            {h.name}
          </label>
        ))}
      </div>

      {selectedHabits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Select at least one habit to compare.</p>
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value) => [`${value}%`, "Completion"]} />
                <Bar dataKey="completion" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 font-medium">Habit</th>
                  <th className="py-1.5 font-medium">Completion</th>
                  <th className="py-1.5 font-medium">Streak</th>
                  <th className="py-1.5 font-medium">Longest</th>
                </tr>
              </thead>
              <tbody>
                {selectedHabits.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-1.5">
                      {h.icon ? `${h.icon} ` : ""}
                      {h.name}
                    </td>
                    <td className="py-1.5">{Math.round(h.completionRate * 100)}%</td>
                    <td className="py-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="size-3.5 text-muted-foreground" />
                        {h.currentStreak}
                      </span>
                    </td>
                    <td className="py-1.5">{h.longestStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
