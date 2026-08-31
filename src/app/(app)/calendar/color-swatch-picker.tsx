"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CALENDAR_COLOR_PALETTE } from "@/lib/calendar-constants";

export function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CALENDAR_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          aria-pressed={value === color}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full transition-transform",
            value === color && "scale-110",
          )}
          style={{ backgroundColor: color }}
        >
          {value === color ? <Check className="size-3.5 text-white" strokeWidth={3} /> : null}
        </button>
      ))}
    </div>
  );
}
