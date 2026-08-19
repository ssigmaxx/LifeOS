import "server-only";

// Open Food Facts is a real, free, open database — this is a genuine live
// lookup, not a stand-in. It covers branded/packaged foods well; for
// generic/home-cooked dishes callers should treat an empty or poor-quality
// result as "no match" and fall back to a clearly-labeled estimate instead
// (see propose_log_meal in ai/tools.ts) — this app does not have access to
// the real German Bundeslebensmittelschlüssel (BLS), which is a licensed
// dataset rather than a public API.
//
// Uses the "search-a-licious" service (search.openfoodfacts.org), not the
// legacy /api/v2/search endpoint — the legacy endpoint's `search_terms`
// parameter no longer does real full-text matching (it silently ignores
// the query and returns an arbitrary result set filtered only by whatever
// other params were passed), which is exactly why every search used to
// return the same handful of products regardless of what was typed.
// search-a-licious takes a single Lucene-syntax `q` string; both the
// country and store filters have to be embedded in it (e.g.
// countries_tags:"en:germany" stores:"Rewe") rather than passed as their
// own params — those aren't recognized as separate query params here.
const SEARCH_URL = "https://search.openfoodfacts.org/search";
const USER_AGENT = "LifeOS-NutritionTracker/1.0 (personal use; not for redistribution)";

// Community-contributed `stores` tagging is sparse — most products have
// none at all — so a store filter that returns nothing falls back to an
// unfiltered search rather than leaving the user with a dead end. The list
// of stores itself (GERMAN_STORES) lives in ./stores, not here — this file
// is server-only, but the store-selector UI needs the list client-side.

export type OpenFoodFactsResult = {
  name: string;
  brand: string | null;
  quantity: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type FoodSearchResult = {
  results: OpenFoodFactsResult[];
  /** True only when a store was requested and actually had matches. */
  matchedStore: boolean;
};

function escapeLuceneQuery(term: string): string {
  // Lucene special characters that would otherwise change query meaning
  // or break parsing if a food name happens to contain them.
  return term.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
}

async function runSearch(term: string, store: string | undefined): Promise<OpenFoodFactsResult[]> {
  const filters = [`countries_tags:"en:germany"`, store ? `stores:"${store}"` : null].filter(Boolean);

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", `${filters.join(" ")} ${term}`);
  url.searchParams.set("fields", "product_name,product_name_de,brands,quantity,nutriments");
  url.searchParams.set("page_size", "8");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return [];
  }
  if (!response.ok) return [];

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return [];
  }

  const products = Array.isArray((data as { hits?: unknown[] })?.hits)
    ? (data as { hits: unknown[] }).hits
    : [];

  const results: OpenFoodFactsResult[] = [];
  for (const raw of products) {
    const product = raw as Record<string, unknown>;
    const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
    const calories = Number(nutriments["energy-kcal_100g"]);
    const name = (product.product_name_de as string | undefined) || (product.product_name as string | undefined);

    if (!name || !Number.isFinite(calories)) continue;

    const protein = Number(nutriments["proteins_100g"]);
    const carbs = Number(nutriments["carbohydrates_100g"]);
    const fat = Number(nutriments["fat_100g"]);
    const brands = product.brands;

    results.push({
      name,
      brand: Array.isArray(brands) && typeof brands[0] === "string" ? brands[0] : null,
      quantity: typeof product.quantity === "string" ? product.quantity : null,
      caloriesPer100g: calories,
      proteinPer100g: Number.isFinite(protein) ? protein : 0,
      carbsPer100g: Number.isFinite(carbs) ? carbs : 0,
      fatPer100g: Number.isFinite(fat) ? fat : 0,
    });

    if (results.length >= 5) break;
  }

  return results;
}

export async function searchOpenFoodFacts(query: string, store?: string): Promise<FoodSearchResult> {
  const trimmed = escapeLuceneQuery(query);
  if (!trimmed) return { results: [], matchedStore: false };

  if (store) {
    const filtered = await runSearch(trimmed, store);
    if (filtered.length > 0) return { results: filtered, matchedStore: true };
  }

  const unfiltered = await runSearch(trimmed, undefined);
  return { results: unfiltered, matchedStore: false };
}
