// Plain data, no I/O — deliberately NOT in open-food-facts.ts (which has
// `import "server-only"`), since this needs to be importable from the
// client-side store-selector UI too.
export const GERMAN_STORES = [
  "REWE",
  "Netto",
  "Kaufland",
  "Edeka",
  "Aldi",
  "Lidl",
  "Penny",
  "Rossmann",
  "dm",
  "denn's Biomarkt",
] as const;
export type GermanStore = (typeof GERMAN_STORES)[number];
