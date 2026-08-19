import "server-only";

// Open Food Facts is a real, free, open database — this is a genuine live
// lookup, not a stand-in. It covers branded/packaged foods well; for
// generic/home-cooked dishes callers should treat an empty or poor-quality
// result as "no match" and fall back to a clearly-labeled estimate instead
// (see propose_log_meal in ai/tools.ts) — this app does not have access to
// the real German Bundeslebensmittelschlüssel (BLS), which is a licensed
// dataset rather than a public API.
const SEARCH_URL = "https://world.openfoodfacts.org/api/v2/search";
const USER_AGENT = "LifeOS-NutritionTracker/1.0 (personal use; not for redistribution)";

export type OpenFoodFactsResult = {
  name: string;
  brand: string | null;
  quantity: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(SEARCH_URL);
  url.searchParams.set("search_terms", trimmed);
  url.searchParams.set("countries_tags_en", "germany");
  url.searchParams.set("fields", "product_name,product_name_de,brands,quantity,nutriments");
  url.searchParams.set("page_size", "8");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
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

  const products = Array.isArray((data as { products?: unknown[] })?.products)
    ? (data as { products: unknown[] }).products
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

    results.push({
      name,
      brand: typeof product.brands === "string" && product.brands ? product.brands.split(",")[0].trim() : null,
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
