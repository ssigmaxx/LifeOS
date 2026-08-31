// A small fixed palette rather than a free color picker, matching the
// app's restrained design system elsewhere (see the artifact-design /
// simplification pass — no ad hoc colors).
export const CALENDAR_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
] as const;

export const DEFAULT_CALENDAR_COLOR: string = CALENDAR_COLOR_PALETTE[5];
