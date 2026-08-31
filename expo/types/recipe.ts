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