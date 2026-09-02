// Fitness Mode filters for the Rezepte tab. Shared between the filter bar
// (menu rendering) and the recipe lists (sort + soft threshold on the
// per-serving AI nutrition estimate). Names are translated via translateText,
// same as CUISINE_FILTERS.

import { Nutrition } from "@/types/recipe";

export interface FitnessFilter {
  id: string;
  name: string;
  // Lower `rank` sorts first. Operates on per-serving nutrition.
  rank?: (n: Nutrition) => number;
  // Optional hard drop for clearly-unfit recipes.
  keep?: (n: Nutrition) => boolean;
}

export function proteinPer100kcal(n: Nutrition): number {
  return n.calories > 0 ? (n.protein * 100) / n.calories : 0;
}
function fatPctKcal(n: Nutrition): number {
  return n.calories > 0 ? (n.fat * 9) / n.calories : 0;
}

export const FITNESS_FILTERS: FitnessFilter[] = [
  { id: "all", name: "Alle" },
  {
    id: "highProtein",
    name: "High Protein",
    rank: (n) => -proteinPer100kcal(n),
    keep: (n) => n.protein >= 15 || proteinPer100kcal(n) >= 7,
  },
  { id: "lowCarb", name: "Low Carb", rank: (n) => n.carbs, keep: (n) => n.carbs <= 30 },
  { id: "lowCalorie", name: "Low Calorie", rank: (n) => n.calories, keep: (n) => n.calories <= 650 },
  {
    id: "lowFat",
    name: "Low Fat",
    rank: (n) => fatPctKcal(n),
    keep: (n) => fatPctKcal(n) <= 0.35,
  },
  { id: "highFiber", name: "High Fiber", rank: (n) => -(n.fiber ?? 0), keep: (n) => (n.fiber ?? 0) >= 5 },
  { id: "keto", name: "Keto", rank: (n) => n.carbs, keep: (n) => n.carbs <= 15 && fatPctKcal(n) >= 0.5 },
];

export function getFitnessFilter(id: string): FitnessFilter | undefined {
  return FITNESS_FILTERS.find((f) => f.id === id);
}

// Apply a fitness filter to a recipe pool given a nutrition lookup. Recipes
// without an estimate yet keep their original order and sort after the ranked
// ones (so the list fills in progressively as estimates arrive).
export function applyFitnessFilter<T extends { id: string }>(
  pool: T[],
  filterId: string,
  nutritionOf: (id: string) => Nutrition | undefined,
): T[] {
  const f = getFitnessFilter(filterId);
  if (!f || f.id === "all" || (!f.rank && !f.keep)) return pool;

  const withN = pool
    .map((r, i) => ({ r, i, n: nutritionOf(r.id) }))
    .filter((x) => !x.n || !f.keep || f.keep(x.n));

  withN.sort((a, b) => {
    if (a.n && b.n) {
      const d = (f.rank ? f.rank(a.n) : 0) - (f.rank ? f.rank(b.n) : 0);
      return d !== 0 ? d : a.i - b.i;
    }
    if (a.n) return -1;
    if (b.n) return 1;
    return a.i - b.i;
  });

  return withN.map((x) => x.r);
}
