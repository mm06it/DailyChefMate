import { Ingredient } from "@/types/recipe";

export const refrigeratorItems: Ingredient[] = [
  // Dairy / Milchprodukte
  { id: "1", name: "Milk", amount: "1L", category: "Dairy", isSelected: false },
  { id: "2", name: "Eggs", amount: "6", category: "Dairy", isSelected: false },
  { id: "3", name: "Butter", amount: "250g", category: "Dairy", isSelected: false },
  { id: "4", name: "Cheddar Cheese", amount: "200g", category: "Dairy", isSelected: false },
  { id: "5", name: "Parmesan", amount: "100g", category: "Dairy", isSelected: false },
  { id: "6", name: "Mozzarella", amount: "200g", category: "Dairy", isSelected: false },
  { id: "7", name: "Yogurt", amount: "500g", category: "Dairy", isSelected: false },
  { id: "8", name: "Heavy Cream", amount: "250ml", category: "Dairy", isSelected: false },
  
  // Meat / Fleisch
  { id: "9", name: "Chicken Breast", amount: "500g", category: "Meat", isSelected: false },
  { id: "10", name: "Ground Beef", amount: "400g", category: "Meat", isSelected: false },
  { id: "11", name: "Bacon", amount: "200g", category: "Meat", isSelected: false },
  { id: "12", name: "Chicken Thighs", amount: "600g", category: "Meat", isSelected: false },
  { id: "13", name: "Pancetta", amount: "150g", category: "Meat", isSelected: false },
  { id: "14", name: "Shrimp", amount: "300g", category: "Meat", isSelected: false },
  
  // Vegetables / Gemüse
  { id: "15", name: "Tomatoes", amount: "4", category: "Vegetables", isSelected: false },
  { id: "16", name: "Cucumber", amount: "2", category: "Vegetables", isSelected: false },
  { id: "17", name: "Lettuce", amount: "1 head", category: "Vegetables", isSelected: false },
  { id: "18", name: "Carrots", amount: "5", category: "Vegetables", isSelected: false },
  { id: "19", name: "Onions", amount: "3", category: "Vegetables", isSelected: false },
  { id: "20", name: "Red Onion", amount: "2", category: "Vegetables", isSelected: false },
  { id: "21", name: "Potatoes", amount: "6", category: "Vegetables", isSelected: false },
  { id: "22", name: "Garlic", amount: "1 bulb", category: "Vegetables", isSelected: false },
  { id: "23", name: "Bell Peppers", amount: "3", category: "Vegetables", isSelected: false },
  { id: "24", name: "Broccoli", amount: "1 head", category: "Vegetables", isSelected: false },
  { id: "25", name: "Cauliflower", amount: "1 head", category: "Vegetables", isSelected: false },
  { id: "26", name: "Mushrooms", amount: "250g", category: "Vegetables", isSelected: false },
  { id: "27", name: "Celery", amount: "3 stalks", category: "Vegetables", isSelected: false },
  { id: "28", name: "Spinach", amount: "200g", category: "Vegetables", isSelected: false },
  { id: "29", name: "Zucchini", amount: "2", category: "Vegetables", isSelected: false },
  { id: "30", name: "Eggplant", amount: "1", category: "Vegetables", isSelected: false },
  
  // Fruits / Früchte
  { id: "31", name: "Apples", amount: "4", category: "Fruits", isSelected: false },
  { id: "32", name: "Bananas", amount: "5", category: "Fruits", isSelected: false },
  { id: "33", name: "Lemons", amount: "2", category: "Fruits", isSelected: false },
  { id: "34", name: "Lime", amount: "3", category: "Fruits", isSelected: false },
  { id: "35", name: "Oranges", amount: "4", category: "Fruits", isSelected: false },
  { id: "36", name: "Strawberries", amount: "250g", category: "Fruits", isSelected: false },
  { id: "37", name: "Blueberries", amount: "200g", category: "Fruits", isSelected: false },
  
  // Grains & Pasta / Getreide & Nudeln
  { id: "38", name: "Rice", amount: "1kg", category: "Grains", isSelected: false },
  { id: "39", name: "Basmati Rice", amount: "500g", category: "Grains", isSelected: false },
  { id: "40", name: "Arborio Rice", amount: "400g", category: "Grains", isSelected: false },
  { id: "41", name: "Pasta", amount: "500g", category: "Pasta", isSelected: false },
  { id: "42", name: "Spaghetti", amount: "500g", category: "Pasta", isSelected: false },
  { id: "43", name: "Rice Noodles", amount: "300g", category: "Pasta", isSelected: false },
  { id: "44", name: "Bread", amount: "1 loaf", category: "Grains", isSelected: false },
  { id: "45", name: "Flour", amount: "1kg", category: "Baking", isSelected: false },
  
  // Spices & Herbs / Gewürze & Kräuter
  { id: "46", name: "Salt", amount: "200g", category: "Spices", isSelected: false },
  { id: "47", name: "Black Pepper", amount: "100g", category: "Spices", isSelected: false },
  { id: "48", name: "Oregano", amount: "50g", category: "Spices", isSelected: false },
  { id: "49", name: "Thyme", amount: "30g", category: "Spices", isSelected: false },
  { id: "50", name: "Fresh Basil", amount: "1 bunch", category: "Spices", isSelected: false },
  { id: "51", name: "Paprika Powder", amount: "80g", category: "Spices", isSelected: false },
  { id: "52", name: "Cumin", amount: "60g", category: "Spices", isSelected: false },
  { id: "53", name: "Curry Powder", amount: "100g", category: "Spices", isSelected: false },
  { id: "54", name: "Ginger", amount: "100g", category: "Spices", isSelected: false },
  { id: "55", name: "Cinnamon", amount: "50g", category: "Spices", isSelected: false },
  
  // Oils & Condiments / Öle & Gewürze
  { id: "56", name: "Olive Oil", amount: "500ml", category: "Oils", isSelected: false },
  { id: "57", name: "Vegetable Oil", amount: "750ml", category: "Oils", isSelected: false },
  { id: "58", name: "Soy Sauce", amount: "250ml", category: "Condiments", isSelected: false },
  { id: "59", name: "Ketchup", amount: "400ml", category: "Condiments", isSelected: false },
  { id: "60", name: "Mayonnaise", amount: "300ml", category: "Condiments", isSelected: false },
  { id: "61", name: "Mustard", amount: "200ml", category: "Condiments", isSelected: false },
  { id: "62", name: "Vinegar", amount: "250ml", category: "Condiments", isSelected: false },
  { id: "63", name: "Lemon Juice", amount: "200ml", category: "Condiments", isSelected: false },
  
  // Frozen & Others / Tiefkühl & Sonstiges
  { id: "64", name: "Frozen Peas", amount: "500g", category: "Frozen", isSelected: false },
  { id: "65", name: "Ice Cream", amount: "1L", category: "Frozen", isSelected: false },
  { id: "66", name: "Coffee", amount: "200g", category: "Beverages", isSelected: false },
  { id: "67", name: "Orange Juice", amount: "1L", category: "Beverages", isSelected: false },
  { id: "68", name: "Sugar", amount: "500g", category: "Baking", isSelected: false },
  { id: "69", name: "Brown Sugar", amount: "300g", category: "Baking", isSelected: false },
  { id: "70", name: "Baking Powder", amount: "100g", category: "Baking", isSelected: false },
  { id: "71", name: "Vanilla Extract", amount: "50ml", category: "Baking", isSelected: false },
  { id: "72", name: "Coconut Milk", amount: "400ml", category: "Dairy", isSelected: false },
  { id: "73", name: "Peas", amount: "300g", category: "Vegetables", isSelected: false },
  { id: "74", name: "Bean Sprouts", amount: "200g", category: "Vegetables", isSelected: false },
  { id: "75", name: "Peanuts", amount: "150g", category: "Nuts", isSelected: false },
];