export interface Recipe {
  id: string;
  name: string;
  image: string;
  rating: number;
  cookTime: string;
  servings: number;
  category: string;
  course?: string;
  ingredients: Ingredient[];
  steps: string[];
  isFavorite: boolean;
  prepTime?: string;
  ovenHeat?: string;
  ovenTime?: string;
  totalTime?: string;
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