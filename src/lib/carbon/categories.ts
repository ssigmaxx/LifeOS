// User-facing categories for manual carbon logging, mapped to the
// parameters Climatiq needs. Kept small and curated rather than exposing
// Climatiq's full classification taxonomy — the app asks "how did you
// travel", not "pick a UNSPSC code".

export type TravelModeOption = "car" | "bus" | "train" | "flight" | "bike_walk";

export const TRAVEL_MODE_LABELS: Record<TravelModeOption, string> = {
  car: "Car",
  bus: "Bus",
  train: "Train",
  flight: "Flight",
  bike_walk: "Bike / walk",
};

// Climatiq's travel endpoint only distinguishes car / rail / air; bus rides
// on the same road network as a car and is approximated with the same
// factor, which is conservative (buses are typically lower per-passenger).
export const TRAVEL_MODE_TO_CLIMATIQ: Record<TravelModeOption, "car" | "rail" | "air" | "bike_walk"> = {
  car: "car",
  bus: "car",
  train: "rail",
  flight: "air",
  bike_walk: "bike_walk",
};

export type EnergyKind = "electricity" | "gas";

export const ENERGY_KIND_LABELS: Record<EnergyKind, string> = {
  electricity: "Electricity",
  gas: "Gas",
};

// Gas heating isn't covered by Climatiq's electricity endpoint and needs a
// different factor source; until that's wired up, gas entries are saved
// with co2e_kg left null (shown as "not calculated yet") same as a missing
// API key.
export const ENERGY_SUPPORTED_BY_API: Record<EnergyKind, boolean> = {
  electricity: true,
  gas: false,
};

export const DEFAULT_ELECTRICITY_REGION = "DE";

export type PurchaseCategoryOption = "groceries" | "dining_out" | "clothing" | "electronics" | "other";

export const PURCHASE_CATEGORY_LABELS: Record<PurchaseCategoryOption, string> = {
  groceries: "Groceries",
  dining_out: "Dining out",
  clothing: "Clothing",
  electronics: "Electronics",
  other: "Other",
};

// NACE Rev. 2 division-level codes — broad but real sector codes, picked to
// be close enough for a personal estimate. Exact codes are worth revisiting
// against Climatiq's /data/v1/search once a live API key is in place.
export const PURCHASE_CATEGORY_TO_NACE: Record<PurchaseCategoryOption, string> = {
  groceries: "47.11",
  dining_out: "56",
  clothing: "47.71",
  electronics: "47.41",
  other: "47",
};

export const DEFAULT_SPEND_REGION = "DE";
export const DEFAULT_CURRENCY = "EUR";
