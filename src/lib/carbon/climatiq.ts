import "server-only";

// Climatiq (climatiq.io) is a free-tier, real emissions-factor API — this is
// a genuine live lookup, not a stand-in. Every call here is defensive: no
// API key configured, a network failure, or an unexpected response shape
// all resolve to `null` rather than throwing, so a page render or a saved
// log entry never breaks on this being unavailable. Callers store the
// activity with co2e_kg left null and surface "not calculated yet" instead.

const BASE_URL = "https://api.climatiq.io";

function getApiKey(): string | null {
  return process.env.CLIMATIQ_API_KEY || null;
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type TravelMode = "car" | "rail" | "air" | "bike_walk";

const CAR_TYPE_BY_MODE: Record<string, string | undefined> = {
  car: "average",
};

// Walking and cycling produce no tailpipe emissions and don't map to a
// Climatiq travel mode — resolved locally, no API call needed.
export async function estimateTravelDistance(input: {
  mode: TravelMode;
  distanceKm: number;
}): Promise<number | null> {
  if (input.mode === "bike_walk") return 0;

  const result = await post<{ co2e: number }>("/travel/v1/distance", {
    travel_mode: input.mode,
    distance_km: input.distanceKm,
    ...(input.mode === "car" ? { car_details: { car_type: CAR_TYPE_BY_MODE.car } } : {}),
  });
  return result?.co2e ?? null;
}

export async function estimateElectricity(input: {
  region: string;
  kwh: number;
}): Promise<number | null> {
  const result = await post<{ location?: { consumption?: { co2e: number } } }>(
    "/energy/v1.3/electricity",
    {
      region: input.region,
      amount: { energy: input.kwh, energy_unit: "kWh" },
    },
  );
  return result?.location?.consumption?.co2e ?? null;
}

export async function estimateProcurementSpend(input: {
  classificationCode: string;
  classificationType: string;
  money: number;
  currency: string;
  region: string;
}): Promise<number | null> {
  const result = await post<{ estimate?: { co2e: number } }>("/procurement/v1/spend", {
    activity: {
      classification_code: input.classificationCode,
      classification_type: input.classificationType,
    },
    money: input.money,
    money_unit: input.currency,
    spend_region: input.region,
    spend_year: new Date().getFullYear(),
  });
  return result?.estimate?.co2e ?? null;
}

export function isClimatiqConfigured(): boolean {
  return getApiKey() != null;
}
