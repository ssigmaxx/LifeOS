"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const MOODS = [
  { value: 1, emoji: "😞", label: "Very low" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

export function MoodPicker({ defaultValue }: { defaultValue?: number | null }) {
  const [mood, setMood] = useState<number | null>(defaultValue ?? null);

  return (
    <div className="flex items-center gap-1.5">
      {MOODS.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-label={m.label}
          aria-pressed={mood === m.value}
          onClick={() => setMood(mood === m.value ? null : m.value)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-lg transition-colors",
            mood === m.value ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted",
          )}
        >
          {m.emoji}
        </button>
      ))}
      <input type="hidden" name="mood" value={mood ?? ""} />
    </div>
  );
}
