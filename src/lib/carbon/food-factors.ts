// Per-kg CO2e factors for common food categories (kg CO2e per kg of food,
// farm-to-table average, "eating habit" / no-waste basis). Figures are
// rounded averages from Our World in Data's food emissions dataset
// (ourworldindata.org/environmental-impacts-of-food) — a published, freely
// available source, not a live API. This lets food emissions show up
// immediately with no signup and no per-entry network call, and keeps
// working even without a CLIMATIQ_API_KEY configured.
//
// Matching is a simple keyword scan over the logged food name, same
// fallback philosophy as open-food-facts.ts: an imprecise category match
// beats no estimate at all, and every entry that doesn't match anything
// falls back to AVERAGE_DIET_FACTOR rather than being silently skipped.

type FoodCategory =
  | "beef_lamb"
  | "pork"
  | "poultry"
  | "fish_seafood"
  | "dairy_eggs"
  | "grains_bread"
  | "vegetables_fruit"
  | "legumes_nuts"
  | "processed_sweets";

const FACTOR_PER_KG: Record<FoodCategory, number> = {
  beef_lamb: 27,
  pork: 7,
  poultry: 6,
  fish_seafood: 5,
  dairy_eggs: 3.5,
  grains_bread: 1.4,
  vegetables_fruit: 0.5,
  legumes_nuts: 1.5,
  processed_sweets: 3,
};

// Checked in order — first match wins, so more specific keywords
// (e.g. "chicken" before generic "meat") should stay near the top of their
// group where an overlap is possible.
const KEYWORDS: [FoodCategory, string[]][] = [
  ["beef_lamb", ["beef", "rind", "steak", "lamb", "burger", "hackfleisch"]],
  ["pork", ["pork", "schwein", "bacon", "ham", "wurst", "sausage"]],
  ["poultry", ["chicken", "huhn", "hähnchen", "turkey", "pute", "geflügel"]],
  ["fish_seafood", ["fish", "fisch", "salmon", "lachs", "tuna", "shrimp", "seafood", "garnelen"]],
  ["dairy_eggs", ["milk", "milch", "cheese", "käse", "yogurt", "joghurt", "butter", "egg", "ei", "eier", "quark", "cream", "sahne"]],
  ["grains_bread", ["bread", "brot", "rice", "reis", "pasta", "nudeln", "noodle", "cereal", "flour", "mehl", "oat", "hafer"]],
  ["vegetables_fruit", ["vegetable", "gemüse", "fruit", "obst", "apple", "apfel", "banana", "tomato", "tomate", "salad", "salat", "potato", "kartoffel"]],
  ["legumes_nuts", ["bean", "bohne", "lentil", "linse", "nut", "nuss", "tofu", "chickpea", "kichererbse"]],
  ["processed_sweets", ["chocolate", "schokolade", "candy", "süßigkeit", "cake", "kuchen", "cookie", "keks", "chip", "snack", "soda", "cola"]],
];

// Rounded midpoint across common categories — the fallback for anything
// that doesn't match a keyword (mixed dishes, brand names, etc.).
const AVERAGE_DIET_FACTOR = 3;

export function estimateFoodCo2eKg(foodName: string, quantityGrams: number): number {
  const lower = foodName.toLowerCase();
  const match = KEYWORDS.find(([, words]) => words.some((w) => lower.includes(w)));
  const factorPerKg = match ? FACTOR_PER_KG[match[0]] : AVERAGE_DIET_FACTOR;
  return (factorPerKg * quantityGrams) / 1000;
}
