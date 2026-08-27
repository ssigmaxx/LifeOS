import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  estimateElectricity,
  estimateProcurementSpend,
  estimateTravelDistance,
  isClimatiqConfigured,
} from "@/lib/carbon/climatiq";
import {
  DEFAULT_CURRENCY,
  DEFAULT_ELECTRICITY_REGION,
  DEFAULT_SPEND_REGION,
  ENERGY_KIND_LABELS,
  ENERGY_SUPPORTED_BY_API,
  PURCHASE_CATEGORY_LABELS,
  PURCHASE_CATEGORY_TO_NACE,
  TRAVEL_MODE_LABELS,
  TRAVEL_MODE_TO_CLIMATIQ,
  type EnergyKind,
  type PurchaseCategoryOption,
  type TravelModeOption,
} from "@/lib/carbon/categories";
import { estimateFoodCo2eKg } from "@/lib/carbon/food-factors";
import { summarizeCarbonActivities, type CarbonActivity, type CarbonCategory, type CarbonSummary } from "@/lib/carbon-summary";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, userId: user.id };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export type RecentActivityItem = {
  id: string;
  category: CarbonCategory;
  date: string;
  label: string;
  co2eKg: number | null;
  deletable: boolean;
};

// --- Travel ---

export async function logTravel(input: {
  mode: TravelModeOption;
  distanceKm: number;
  occurredAt?: string;
  note?: string;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const co2eKg = await estimateTravelDistance({
    mode: TRAVEL_MODE_TO_CLIMATIQ[input.mode],
    distanceKm: input.distanceKm,
  });
  const { error } = await supabase.from("carbon_travel_logs").insert({
    user_id: userId,
    occurred_at: input.occurredAt ?? todayISO(),
    mode: input.mode,
    distance_km: input.distanceKm,
    co2e_kg: co2eKg,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function deleteTravelLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("carbon_travel_logs").delete().eq("id", id);
  if (error) throw error;
}

// --- Energy ---

export async function logEnergy(input: {
  kind: EnergyKind;
  amount: number;
  occurredAt?: string;
  note?: string;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const co2eKg = ENERGY_SUPPORTED_BY_API[input.kind]
    ? await estimateElectricity({ region: DEFAULT_ELECTRICITY_REGION, kwh: input.amount })
    : null;
  const { error } = await supabase.from("carbon_energy_logs").insert({
    user_id: userId,
    occurred_at: input.occurredAt ?? todayISO(),
    kind: input.kind,
    amount: input.amount,
    unit: "kWh",
    co2e_kg: co2eKg,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function deleteEnergyLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("carbon_energy_logs").delete().eq("id", id);
  if (error) throw error;
}

// --- Purchases ---

export async function logPurchase(input: {
  category: PurchaseCategoryOption;
  amount: number;
  occurredAt?: string;
  note?: string;
}): Promise<void> {
  const { supabase, userId } = await requireUserId();
  const co2eKg = await estimateProcurementSpend({
    classificationCode: PURCHASE_CATEGORY_TO_NACE[input.category],
    classificationType: "nace2",
    money: input.amount,
    currency: DEFAULT_CURRENCY,
    region: DEFAULT_SPEND_REGION,
  });
  const { error } = await supabase.from("carbon_purchase_logs").insert({
    user_id: userId,
    occurred_at: input.occurredAt ?? todayISO(),
    category: input.category,
    amount: input.amount,
    currency: DEFAULT_CURRENCY,
    co2e_kg: co2eKg,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function deletePurchaseLog(id: string): Promise<void> {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("carbon_purchase_logs").delete().eq("id", id);
  if (error) throw error;
}

// --- Food (derived, read-only) ---

async function getFoodActivities(
  startDate: string,
  endDate: string,
): Promise<{ activities: CarbonActivity[]; items: RecentActivityItem[] }> {
  const { supabase, userId } = await requireUserId();
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, log_date, food_name, quantity_grams")
    .eq("user_id", userId)
    .gte("log_date", startDate)
    .lte("log_date", endDate)
    .order("log_date", { ascending: false });
  if (error) throw error;

  const activities: CarbonActivity[] = [];
  const items: RecentActivityItem[] = [];
  for (const row of data) {
    const co2eKg = estimateFoodCo2eKg(row.food_name, row.quantity_grams);
    activities.push({ category: "food", date: row.log_date, co2eKg });
    items.push({
      id: row.id,
      category: "food",
      date: row.log_date,
      label: `${row.food_name} · ${row.quantity_grams}g`,
      co2eKg,
      deletable: false,
    });
  }
  return { activities, items };
}

// --- Combined summary + recent activity ---

async function getActivitiesForRange(startDate: string, endDate: string): Promise<CarbonActivity[]> {
  const { supabase, userId } = await requireUserId();

  const [travel, energy, purchases, food] = await Promise.all([
    supabase
      .from("carbon_travel_logs")
      .select("occurred_at, co2e_kg")
      .eq("user_id", userId)
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    supabase
      .from("carbon_energy_logs")
      .select("occurred_at, co2e_kg")
      .eq("user_id", userId)
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    supabase
      .from("carbon_purchase_logs")
      .select("occurred_at, co2e_kg")
      .eq("user_id", userId)
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    getFoodActivities(startDate, endDate),
  ]);
  if (travel.error) throw travel.error;
  if (energy.error) throw energy.error;
  if (purchases.error) throw purchases.error;

  return [
    ...travel.data.map((r) => ({ category: "travel" as const, date: r.occurred_at, co2eKg: r.co2e_kg })),
    ...energy.data.map((r) => ({ category: "energy" as const, date: r.occurred_at, co2eKg: r.co2e_kg })),
    ...purchases.data.map((r) => ({ category: "shopping" as const, date: r.occurred_at, co2eKg: r.co2e_kg })),
    ...food.activities,
  ];
}

export async function getCarbonSummary(days: number = 30): Promise<CarbonSummary> {
  const startDate = daysAgoISO(days - 1);
  const endDate = todayISO();
  const activities = await getActivitiesForRange(startDate, endDate);
  return summarizeCarbonActivities(activities, { startDate, endDate });
}

// Total (all categories combined) CO2e per day, for pairing against other
// daily metrics — see analytics-service.ts's cross-metric insights.
export async function getDailyCarbonTotals(range: { start: string; end: string }): Promise<Map<string, number>> {
  const activities = await getActivitiesForRange(range.start, range.end);
  const summary = summarizeCarbonActivities(activities, { startDate: range.start, endDate: range.end });
  return new Map(
    summary.dailySeries.map((point) => [point.date, point.food + point.travel + point.energy + point.shopping]),
  );
}

export async function getRecentActivity(limit: number = 10): Promise<RecentActivityItem[]> {
  const { supabase, userId } = await requireUserId();
  const startDate = daysAgoISO(30);
  const endDate = todayISO();

  const [travel, energy, purchases, food] = await Promise.all([
    supabase
      .from("carbon_travel_logs")
      .select("id, occurred_at, mode, distance_km, co2e_kg")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    supabase
      .from("carbon_energy_logs")
      .select("id, occurred_at, kind, amount, co2e_kg")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    supabase
      .from("carbon_purchase_logs")
      .select("id, occurred_at, category, amount, currency, co2e_kg")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    getFoodActivities(startDate, endDate),
  ]);
  if (travel.error) throw travel.error;
  if (energy.error) throw energy.error;
  if (purchases.error) throw purchases.error;

  const items: RecentActivityItem[] = [
    ...travel.data.map((r) => ({
      id: r.id,
      category: "travel" as const,
      date: r.occurred_at,
      label: `${TRAVEL_MODE_LABELS[r.mode as TravelModeOption]} · ${r.distance_km} km`,
      co2eKg: r.co2e_kg,
      deletable: true,
    })),
    ...energy.data.map((r) => ({
      id: r.id,
      category: "energy" as const,
      date: r.occurred_at,
      label: `${ENERGY_KIND_LABELS[r.kind as EnergyKind]} · ${r.amount} kWh`,
      co2eKg: r.co2e_kg,
      deletable: true,
    })),
    ...purchases.data.map((r) => ({
      id: r.id,
      category: "shopping" as const,
      date: r.occurred_at,
      label: `${PURCHASE_CATEGORY_LABELS[r.category as PurchaseCategoryOption]} · ${r.amount} ${r.currency}`,
      co2eKg: r.co2e_kg,
      deletable: true,
    })),
    ...food.items,
  ];

  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, limit);
}

export async function getTodayCarbonTotal(): Promise<{ totalCo2eKg: number; awaitingCalculationCount: number }> {
  const summary = await getCarbonSummary(1);
  return { totalCo2eKg: summary.totalCo2eKg, awaitingCalculationCount: summary.awaitingCalculationCount };
}

export function isCarbonApiConfigured(): boolean {
  return isClimatiqConfigured();
}
