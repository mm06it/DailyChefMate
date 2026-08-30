import { Ingredient } from '@/types/recipe';
import { catalogItems } from '@/mocks/refrigerator';

interface OnlineIngredient {
  name: string;
  category: string;
  // Default catalogue amount (e.g. "500g"), when known — used only so the
  // search can also match on quantity ("500g" → every 500g item).
  amount?: string;
}

const COMMON_INGREDIENTS: OnlineIngredient[] = [
  // Fruits
  { name: 'Apple', category: 'Fruits' },
  { name: 'Banana', category: 'Fruits' },
  { name: 'Orange', category: 'Fruits' },
  { name: 'Lemon', category: 'Fruits' },
  { name: 'Lime', category: 'Fruits' },
  { name: 'Strawberry', category: 'Fruits' },
  { name: 'Blueberry', category: 'Fruits' },
  { name: 'Raspberry', category: 'Fruits' },
  { name: 'Blackberry', category: 'Fruits' },
  { name: 'Grape', category: 'Fruits' },
  { name: 'Pineapple', category: 'Fruits' },
  { name: 'Mango', category: 'Fruits' },
  { name: 'Papaya', category: 'Fruits' },
  { name: 'Kiwi', category: 'Fruits' },
  { name: 'Peach', category: 'Fruits' },
  { name: 'Pear', category: 'Fruits' },
  { name: 'Plum', category: 'Fruits' },
  { name: 'Cherry', category: 'Fruits' },
  { name: 'Watermelon', category: 'Fruits' },
  { name: 'Cantaloupe', category: 'Fruits' },
  { name: 'Honeydew', category: 'Fruits' },
  { name: 'Avocado', category: 'Fruits' },
  { name: 'Coconut', category: 'Fruits' },
  
  // Vegetables
  { name: 'Tomato', category: 'Vegetables' },
  { name: 'Cucumber', category: 'Vegetables' },
  { name: 'Lettuce', category: 'Vegetables' },
  { name: 'Spinach', category: 'Vegetables' },
  { name: 'Kale', category: 'Vegetables' },
  { name: 'Arugula', category: 'Vegetables' },
  { name: 'Carrot', category: 'Vegetables' },
  { name: 'Celery', category: 'Vegetables' },
  { name: 'Onion', category: 'Vegetables' },
  { name: 'Red Onion', category: 'Vegetables' },
  { name: 'Green Onion', category: 'Vegetables' },
  { name: 'Garlic', category: 'Vegetables' },
  { name: 'Ginger', category: 'Vegetables' },
  { name: 'Potato', category: 'Vegetables' },
  { name: 'Sweet Potato', category: 'Vegetables' },
  { name: 'Bell Pepper', category: 'Vegetables' },
  { name: 'Jalapeño', category: 'Vegetables' },
  { name: 'Chili Pepper', category: 'Vegetables' },
  { name: 'Broccoli', category: 'Vegetables' },
  { name: 'Cauliflower', category: 'Vegetables' },
  { name: 'Cabbage', category: 'Vegetables' },
  { name: 'Brussels Sprouts', category: 'Vegetables' },
  { name: 'Asparagus', category: 'Vegetables' },
  { name: 'Green Beans', category: 'Vegetables' },
  { name: 'Peas', category: 'Vegetables' },
  { name: 'Corn', category: 'Vegetables' },
  { name: 'Zucchini', category: 'Vegetables' },
  { name: 'Eggplant', category: 'Vegetables' },
  { name: 'Mushroom', category: 'Vegetables' },
  { name: 'Radish', category: 'Vegetables' },
  { name: 'Beet', category: 'Vegetables' },
  { name: 'Turnip', category: 'Vegetables' },
  
  // Herbs
  { name: 'Basil', category: 'Herbs' },
  { name: 'Parsley', category: 'Herbs' },
  { name: 'Cilantro', category: 'Herbs' },
  { name: 'Mint', category: 'Herbs' },
  { name: 'Oregano', category: 'Herbs' },
  { name: 'Thyme', category: 'Herbs' },
  { name: 'Rosemary', category: 'Herbs' },
  { name: 'Sage', category: 'Herbs' },
  { name: 'Dill', category: 'Herbs' },
  { name: 'Chives', category: 'Herbs' },
  
  // Dairy
  { name: 'Milk', category: 'Dairy' },
  { name: 'Almond Milk', category: 'Dairy' },
  { name: 'Soy Milk', category: 'Dairy' },
  { name: 'Oat Milk', category: 'Dairy' },
  { name: 'Coconut Milk', category: 'Dairy' },
  { name: 'Yogurt', category: 'Dairy' },
  { name: 'Greek Yogurt', category: 'Dairy' },
  { name: 'Cheese', category: 'Dairy' },
  { name: 'Cheddar Cheese', category: 'Dairy' },
  { name: 'Mozzarella', category: 'Dairy' },
  { name: 'Parmesan', category: 'Dairy' },
  { name: 'Feta Cheese', category: 'Dairy' },
  { name: 'Goat Cheese', category: 'Dairy' },
  { name: 'Cream Cheese', category: 'Dairy' },
  { name: 'Butter', category: 'Dairy' },
  { name: 'Heavy Cream', category: 'Dairy' },
  { name: 'Sour Cream', category: 'Dairy' },
  { name: 'Eggs', category: 'Dairy' },
  
  // Meat & Seafood
  { name: 'Chicken Breast', category: 'Meat' },
  { name: 'Chicken Thigh', category: 'Meat' },
  { name: 'Ground Chicken', category: 'Meat' },
  { name: 'Turkey', category: 'Meat' },
  { name: 'Ground Turkey', category: 'Meat' },
  { name: 'Beef', category: 'Meat' },
  { name: 'Ground Beef', category: 'Meat' },
  { name: 'Steak', category: 'Meat' },
  { name: 'Pork', category: 'Meat' },
  { name: 'Bacon', category: 'Meat' },
  { name: 'Ham', category: 'Meat' },
  { name: 'Sausage', category: 'Meat' },
  { name: 'Salmon', category: 'Seafood' },
  { name: 'Tuna', category: 'Seafood' },
  { name: 'Shrimp', category: 'Seafood' },
  { name: 'Crab', category: 'Seafood' },
  { name: 'Lobster', category: 'Seafood' },
  { name: 'Cod', category: 'Seafood' },
  { name: 'Tilapia', category: 'Seafood' },
  
  // Grains & Legumes
  { name: 'Rice', category: 'Grains' },
  { name: 'Brown Rice', category: 'Grains' },
  { name: 'Quinoa', category: 'Grains' },
  { name: 'Oats', category: 'Grains' },
  { name: 'Barley', category: 'Grains' },
  { name: 'Wheat', category: 'Grains' },
  { name: 'Bread', category: 'Grains' },
  { name: 'Pasta', category: 'Grains' },
  { name: 'Noodles', category: 'Grains' },
  { name: 'Black Beans', category: 'Legumes' },
  { name: 'Kidney Beans', category: 'Legumes' },
  { name: 'Chickpeas', category: 'Legumes' },
  { name: 'Lentils', category: 'Legumes' },
  { name: 'Pinto Beans', category: 'Legumes' },
  
  // Nuts & Seeds
  { name: 'Almonds', category: 'Nuts' },
  { name: 'Walnuts', category: 'Nuts' },
  { name: 'Pecans', category: 'Nuts' },
  { name: 'Cashews', category: 'Nuts' },
  { name: 'Peanuts', category: 'Nuts' },
  { name: 'Pistachios', category: 'Nuts' },
  { name: 'Sunflower Seeds', category: 'Seeds' },
  { name: 'Pumpkin Seeds', category: 'Seeds' },
  { name: 'Chia Seeds', category: 'Seeds' },
  { name: 'Flax Seeds', category: 'Seeds' },
  
  // Spices & Condiments
  { name: 'Salt', category: 'Spices' },
  { name: 'Black Pepper', category: 'Spices' },
  { name: 'Paprika', category: 'Spices' },
  { name: 'Cumin', category: 'Spices' },
  { name: 'Turmeric', category: 'Spices' },
  { name: 'Cinnamon', category: 'Spices' },
  { name: 'Nutmeg', category: 'Spices' },
  { name: 'Cardamom', category: 'Spices' },
  { name: 'Cloves', category: 'Spices' },
  { name: 'Bay Leaves', category: 'Spices' },
  { name: 'Curry Powder', category: 'Spices' },
  { name: 'Chili Powder', category: 'Spices' },
  { name: 'Garlic Powder', category: 'Spices' },
  { name: 'Onion Powder', category: 'Spices' },
  { name: 'Olive Oil', category: 'Oils' },
  { name: 'Vegetable Oil', category: 'Oils' },
  { name: 'Coconut Oil', category: 'Oils' },
  { name: 'Sesame Oil', category: 'Oils' },
  { name: 'Vinegar', category: 'Condiments' },
  { name: 'Balsamic Vinegar', category: 'Condiments' },
  { name: 'Soy Sauce', category: 'Condiments' },
  { name: 'Hot Sauce', category: 'Condiments' },
  { name: 'Ketchup', category: 'Condiments' },
  { name: 'Mustard', category: 'Condiments' },
  { name: 'Mayonnaise', category: 'Condiments' },
];

// The searchable universe: the hand-picked common list above merged with the
// full refrigerator catalogue (of which only the ~12 most common per category
// are seeded into a new fridge). Dedup by lowercased name, common list wins.
const SEARCHABLE_INGREDIENTS: OnlineIngredient[] = (() => {
  const byName = new Map<string, OnlineIngredient>();
  for (const item of COMMON_INGREDIENTS) {
    byName.set(item.name.toLowerCase(), item);
  }
  for (const item of catalogItems) {
    const key = item.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { name: item.name, category: item.category, amount: item.amount });
    }
  }
  return Array.from(byName.values());
})();

export async function searchIngredientsOnline(query: string): Promise<Ingredient[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  // "500 g" and "500g" should behave the same when matching quantities.
  const compactQuery = normalizedQuery.replace(/\s+/g, '');

  // Match on name or on the catalogue amount ("500g" → every 500g item).
  const matchingIngredients = SEARCHABLE_INGREDIENTS.filter(ingredient => {
    if (ingredient.name.toLowerCase().includes(normalizedQuery)) return true;
    const amount = ingredient.amount?.toLowerCase().replace(/\s+/g, '');
    return !!amount && amount.includes(compactQuery);
  });

  // Convert to our Ingredient format
  const results: Ingredient[] = matchingIngredients.slice(0, 20).map((ingredient, index) => ({
    id: `online-${Date.now()}-${index}`,
    name: ingredient.name,
    amount: '',
    category: ingredient.category,
    isSelected: false,
    isOnlineResult: true,
  }));

  return results;
}

export function generateIngredientId(): string {
  return `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}