export const CYCLE_SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Nausea",
  "Backache",
  "Tender breasts",
  "Acne",
] as const;

export const MOOD_LABELS: Record<number, string> = {
  1: "1 · Very low",
  2: "2 · Low",
  3: "3 · Okay",
  4: "4 · Good",
  5: "5 · Great",
};

export const PAIN_LABELS: Record<number, string> = {
  0: "0 · None",
  1: "1 · Mild",
  2: "2 · Noticeable",
  3: "3 · Moderate",
  4: "4 · Strong",
  5: "5 · Severe",
};

export const FLOW_LABELS: Record<string, string> = {
  spotting: "Spotting",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
};
