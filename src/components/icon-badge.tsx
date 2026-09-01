import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// A small, curated set of tinted tones — not a full color wheel — so each
// domain (water, sleep, workout...) reads at a glance without turning the
// page into a rainbow. Every tone keeps a light/dark pair, matching the
// tinted-card pattern already used in nutrition/meal-list.tsx.
const TONE_CLASSES = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  teal: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  lime: "bg-lime-50 text-lime-600 dark:bg-lime-950/40 dark:text-lime-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  muted: "bg-muted text-muted-foreground",
} as const;

export type IconBadgeTone = keyof typeof TONE_CLASSES;

export function IconBadge({
  icon: Icon,
  tone = "muted",
  className,
}: {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  className?: string;
}) {
  return (
    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[tone], className)}>
      <Icon className="size-4" />
    </div>
  );
}
