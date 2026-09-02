export interface Recipe {
  id: string;
  name: string;
  image: string;
  rating: number;
  cookTime: string;
  servings: number;
  category: string;
  course?: string;
  // Cuisine / country of origin (TheMealDB strArea). Runtime-only on browse
  // results — not persisted, so it's stripped before a recipe is saved.
  area?: string;
  ingredients: Ingredient[];
  steps: string[];
  isFavorite: boolean;
  prepTime?: string;
  ovenHeat?: string;
  ovenTime?: string;
  totalTime?: string;
  // Custom recipes only: 'cooking' or 'baking' — drives which fields the
  // Add Recipe form shows. `ovenMode` is the oven setting for baking recipes.
  mode?: string;
  ovenMode?: string;
  // Custom recipes only: 'private' (not shown to friends) or 'public'.
  visibility?: string;
  // Custom recipes only: present when the image is an uploaded photo.
  imageStorageId?: string;
  // Set only on results from the ingredient search: which of the picked
  // ingredients this recipe uses, and which it still needs.
  usedIngredients?: string[];
  missedIngredients?: string[];
  // Fitness Mode: per-serving nutrition. On custom recipes it may be
  // user-entered; everywhere else it's an AI estimate filled in on demand.
  nutrition?: Nutrition;
  // Custom recipes only: the user marked this a fitness recipe in Add Recipe.
  isFitnessRecipe?: boolean;
}

// Per-serving nutrition. Multiply by the serving count for a batch total.
export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  // false = the user typed these numbers, true = AI estimate ("~").
  estimated: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  category: string;
  isSelected?: boolean;
  isOnlineResult?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}