// A curated swatch grid rather than a free-form color wheel, matching the
// app's restrained design system elsewhere (see the artifact-design /
// simplification pass — no ad hoc colors) — but drawn from Apple Calendar's
// own system palette (the same named colors iOS/macOS Calendar offers when
// you create or recolor a calendar) so there's real range to choose from.
export const CALENDAR_COLOR_PALETTE = [
  "#ff3b30", // red
  "#ff9500", // orange
  "#ffcc00", // yellow
  "#34c759", // green
  "#00c7be", // mint
  "#30b0c7", // teal
  "#32ade6", // cyan
  "#007aff", // blue
  "#5856d6", // indigo
  "#af52de", // purple
  "#ff2d55", // pink
  "#a2845e", // brown
] as const;

export const DEFAULT_CALENDAR_COLOR: string = CALENDAR_COLOR_PALETTE[7];
