// Size caps for recipe snapshots that users submit and that then get copied
// into other users' data (favorites, meal plans, shared recipes, the feed).
// Convex validators can't express max-length, so this is a runtime clamp.
// Egregiously large arrays throw; everything else is truncated.

const NAME_MAX = 200;
const IMAGE_MAX = 500;
const CATEGORY_MAX = 80;
const SHORT_FIELD_MAX = 40;
const STEP_MAX = 2000;
const STEPS_MAX = 60;
const STEPS_HARD = 200;
const ING_NAME_MAX = 120;
const ING_AMOUNT_MAX = 60;
const ING_ID_MAX = 64;
const INGREDIENTS_MAX = 100;
const INGREDIENTS_HARD = 300;

const OPTIONAL_SHORT_FIELDS = [
  "course",
  "prepTime",
  "ovenHeat",
  "ovenTime",
  "totalTime",
  "mode",
  "ovenMode",
] as const;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function safeImage(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  return /^https?:\/\//.test(s) ? s.slice(0, IMAGE_MAX) : "";
}

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}

/**
 * Return a size-clamped copy of a recipe snapshot. Preserves `id` and any
 * extra keys the caller passes (e.g. `usedIngredients`); only rewrites the
 * fields with abuse potential, and never adds an optional field that wasn't
 * already present (some callers' validators are a strict subset).
 */
export function clampRecipeSnapshot<T extends Record<string, any>>(r: T): T {
  const steps: unknown[] = Array.isArray(r.steps) ? r.steps : [];
  if (steps.length > STEPS_HARD) throw new Error("RECIPE_TOO_LARGE");
  const ingredients: any[] = Array.isArray(r.ingredients) ? r.ingredients : [];
  if (ingredients.length > INGREDIENTS_HARD) throw new Error("RECIPE_TOO_LARGE");

  const out: Record<string, any> = {
    ...r,
    name: str(r.name, NAME_MAX).trim() || "Recipe",
    image: safeImage(r.image),
    rating: clampNum(r.rating, 0, 5, 0),
    servings: clampNum(r.servings, 1, 100, 1),
    cookTime: str(r.cookTime, SHORT_FIELD_MAX),
    category: str(r.category, CATEGORY_MAX),
    steps: steps.slice(0, STEPS_MAX).map((s) => str(s, STEP_MAX)),
    ingredients: ingredients.slice(0, INGREDIENTS_MAX).map((i, idx) => ({
      id: str(i?.id, ING_ID_MAX) || `ing_${idx}`,
      name: str(i?.name, ING_NAME_MAX),
      amount: str(i?.amount, ING_AMOUNT_MAX),
      category: str(i?.category, SHORT_FIELD_MAX) || "Other",
    })),
  };
  for (const f of OPTIONAL_SHORT_FIELDS) {
    if (r[f] !== undefined) out[f] = str(r[f], SHORT_FIELD_MAX);
  }
  return out as T;
}
