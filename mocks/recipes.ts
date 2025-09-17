import { Recipe } from "@/types/recipe";

export const recipes: Recipe[] = [
  {
    id: "1",
    name: "Spaghetti Carbonara",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    cookTime: "25 min",
    servings: 4,
    category: "Italian",
    course: "Hauptspeise",
    ingredients: [
      { id: "1", name: "Spaghetti", amount: "400g", category: "Pasta" },
      { id: "2", name: "Eggs", amount: "3", category: "Dairy" },
      { id: "3", name: "Pancetta", amount: "150g", category: "Meat" },
      { id: "4", name: "Parmesan", amount: "50g", category: "Dairy" },
      { id: "5", name: "Black Pepper", amount: "to taste", category: "Spices" },
      { id: "6", name: "Salt", amount: "to taste", category: "Spices" },
    ],
    steps: [
      "Bring a large pot of salted water to boil and cook spaghetti according to package instructions.",
      "While pasta cooks, heat a large skillet over medium heat. Add pancetta and cook until crispy.",
      "In a bowl, whisk together eggs, grated parmesan, and black pepper.",
      "Drain pasta, reserving 1/2 cup of pasta water.",
      "Working quickly, add hot pasta to the skillet with pancetta, then remove from heat.",
      "Pour egg mixture over pasta and toss quickly to coat pasta and create a creamy sauce.",
      "Add a splash of pasta water if needed to loosen the sauce.",
      "Serve immediately with extra parmesan and black pepper."
    ],
    isFavorite: false
  },
  {
    id: "2",
    name: "Chicken Stir Fry",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.5,
    cookTime: "20 min",
    servings: 3,
    category: "Asian",
    course: "Hauptspeise",
    ingredients: [
      { id: "7", name: "Chicken Breast", amount: "500g", category: "Meat" },
      { id: "8", name: "Bell Peppers", amount: "2", category: "Vegetables" },
      { id: "9", name: "Broccoli", amount: "1 head", category: "Vegetables" },
      { id: "10", name: "Carrots", amount: "2", category: "Vegetables" },
      { id: "11", name: "Soy Sauce", amount: "3 tbsp", category: "Condiments" },
      { id: "12", name: "Garlic", amount: "3 cloves", category: "Vegetables" },
      { id: "13", name: "Ginger", amount: "1 tbsp", category: "Spices" },
      { id: "14", name: "Vegetable Oil", amount: "2 tbsp", category: "Oils" },
    ],
    steps: [
      "Slice chicken breast into thin strips.",
      "Chop all vegetables into bite-sized pieces.",
      "Heat oil in a wok or large skillet over high heat.",
      "Add chicken and stir-fry until no longer pink, about 5 minutes.",
      "Add garlic and ginger, stir for 30 seconds until fragrant.",
      "Add vegetables and stir-fry for 5-7 minutes until crisp-tender.",
      "Pour in soy sauce and stir to coat everything evenly.",
      "Serve hot over rice or noodles."
    ],
    isFavorite: true
  },
  {
    id: "3",
    name: "Greek Salad",
    image: "https://images.unsplash.com/photo-1551248429-40975aa4de74?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    cookTime: "15 min",
    servings: 4,
    category: "Mediterranean",
    course: "Vorspeise",
    ingredients: [
      { id: "15", name: "Cucumber", amount: "1", category: "Vegetables" },
      { id: "16", name: "Tomatoes", amount: "4", category: "Vegetables" },
      { id: "17", name: "Red Onion", amount: "1/2", category: "Vegetables" },
      { id: "18", name: "Feta Cheese", amount: "200g", category: "Dairy" },
      { id: "19", name: "Kalamata Olives", amount: "1/2 cup", category: "Vegetables" },
      { id: "20", name: "Olive Oil", amount: "1/4 cup", category: "Oils" },
      { id: "21", name: "Lemon Juice", amount: "2 tbsp", category: "Condiments" },
      { id: "22", name: "Oregano", amount: "1 tsp", category: "Spices" },
    ],
    steps: [
      "Dice cucumber and tomatoes into bite-sized pieces.",
      "Thinly slice the red onion.",
      "In a large bowl, combine cucumber, tomatoes, red onion, and olives.",
      "Crumble feta cheese over the vegetables.",
      "In a small bowl, whisk together olive oil, lemon juice, oregano, salt, and pepper.",
      "Pour dressing over the salad and toss gently to combine.",
      "Let sit for 10 minutes before serving to allow flavors to meld."
    ],
    isFavorite: false
  },
  {
    id: "4",
    name: "Vegetable Curry",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    cookTime: "35 min",
    servings: 4,
    category: "Indian",
    course: "Hauptspeise",
    ingredients: [
      { id: "23", name: "Potatoes", amount: "2", category: "Vegetables" },
      { id: "24", name: "Cauliflower", amount: "1/2 head", category: "Vegetables" },
      { id: "25", name: "Peas", amount: "1 cup", category: "Vegetables" },
      { id: "26", name: "Carrots", amount: "2", category: "Vegetables" },
      { id: "27", name: "Coconut Milk", amount: "400ml", category: "Dairy" },
      { id: "28", name: "Curry Powder", amount: "2 tbsp", category: "Spices" },
      { id: "29", name: "Garlic", amount: "3 cloves", category: "Vegetables" },
      { id: "30", name: "Ginger", amount: "1 tbsp", category: "Spices" },
      { id: "31", name: "Vegetable Broth", amount: "1 cup", category: "Condiments" },
    ],
    steps: [
      "Dice potatoes and carrots into 1-inch pieces. Break cauliflower into florets.",
      "Heat oil in a large pot over medium heat. Add garlic and ginger, sauté for 1 minute.",
      "Add curry powder and stir for 30 seconds until fragrant.",
      "Add potatoes, carrots, and cauliflower. Stir to coat with spices.",
      "Pour in vegetable broth, bring to a boil, then reduce heat and simmer for 15 minutes.",
      "Add coconut milk and peas, simmer for another 10 minutes until vegetables are tender.",
      "Season with salt to taste.",
      "Serve hot with rice or naan bread."
    ],
    isFavorite: true
  },
  {
    id: "5",
    name: "Chocolate Chip Cookies",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    cookTime: "25 min",
    servings: 24,
    category: "Dessert",
    course: "Nachspeise",
    ingredients: [
      { id: "32", name: "Butter", amount: "225g", category: "Dairy" },
      { id: "33", name: "Brown Sugar", amount: "200g", category: "Baking" },
      { id: "34", name: "White Sugar", amount: "100g", category: "Baking" },
      { id: "35", name: "Eggs", amount: "2", category: "Dairy" },
      { id: "36", name: "Vanilla Extract", amount: "2 tsp", category: "Baking" },
      { id: "37", name: "Flour", amount: "280g", category: "Baking" },
      { id: "38", name: "Baking Soda", amount: "1 tsp", category: "Baking" },
      { id: "39", name: "Salt", amount: "1/2 tsp", category: "Spices" },
      { id: "40", name: "Chocolate Chips", amount: "300g", category: "Baking" },
    ],
    steps: [
      "Preheat oven to 190°C (375°F).",
      "In a large bowl, cream together butter, brown sugar, and white sugar until smooth.",
      "Beat in eggs one at a time, then stir in vanilla.",
      "In a separate bowl, combine flour, baking soda, and salt.",
      "Gradually add dry ingredients to the wet mixture and mix well.",
      "Fold in chocolate chips.",
      "Drop by rounded tablespoons onto ungreased baking sheets.",
      "Bake for 9-11 minutes until edges are golden brown.",
      "Allow cookies to cool on baking sheet for 2 minutes before transferring to a wire rack."
    ],
    isFavorite: false
  },
  {
    id: "6",
    name: "Beef Tacos",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    cookTime: "30 min",
    servings: 4,
    category: "Mexican",
    ingredients: [
      { id: "41", name: "Ground Beef", amount: "500g", category: "Meat" },
      { id: "42", name: "Taco Shells", amount: "8", category: "Bread" },
      { id: "43", name: "Lettuce", amount: "1 head", category: "Vegetables" },
      { id: "44", name: "Tomatoes", amount: "2", category: "Vegetables" },
      { id: "45", name: "Cheddar Cheese", amount: "200g", category: "Dairy" },
      { id: "46", name: "Sour Cream", amount: "200ml", category: "Dairy" },
      { id: "47", name: "Taco Seasoning", amount: "1 packet", category: "Spices" },
      { id: "48", name: "Onion", amount: "1", category: "Vegetables" },
    ],
    steps: [
      "Brown ground beef in a large skillet over medium-high heat.",
      "Add diced onion and cook until softened.",
      "Stir in taco seasoning and cook according to package directions.",
      "Warm taco shells in oven according to package instructions.",
      "Shred lettuce and dice tomatoes.",
      "Grate cheddar cheese.",
      "Fill taco shells with beef mixture.",
      "Top with lettuce, tomatoes, cheese, and sour cream."
    ],
    isFavorite: false
  },
  {
    id: "7",
    name: "Caesar Salad",
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.4,
    cookTime: "15 min",
    servings: 4,
    category: "Salad",
    ingredients: [
      { id: "49", name: "Romaine Lettuce", amount: "2 heads", category: "Vegetables" },
      { id: "50", name: "Parmesan", amount: "100g", category: "Dairy" },
      { id: "51", name: "Croutons", amount: "1 cup", category: "Bread" },
      { id: "52", name: "Caesar Dressing", amount: "1/2 cup", category: "Condiments" },
      { id: "53", name: "Anchovies", amount: "4 fillets", category: "Fish" },
      { id: "54", name: "Lemon", amount: "1", category: "Fruits" },
    ],
    steps: [
      "Wash and chop romaine lettuce into bite-sized pieces.",
      "Grate fresh parmesan cheese.",
      "In a large bowl, toss lettuce with Caesar dressing.",
      "Add croutons and toss gently.",
      "Top with grated parmesan and anchovies.",
      "Serve with lemon wedges."
    ],
    isFavorite: false
  },
  {
    id: "8",
    name: "Chicken Curry",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    cookTime: "45 min",
    servings: 6,
    category: "Indian",
    ingredients: [
      { id: "55", name: "Chicken Thighs", amount: "1kg", category: "Meat" },
      { id: "56", name: "Coconut Milk", amount: "400ml", category: "Dairy" },
      { id: "57", name: "Curry Paste", amount: "3 tbsp", category: "Spices" },
      { id: "58", name: "Onion", amount: "2", category: "Vegetables" },
      { id: "59", name: "Garlic", amount: "4 cloves", category: "Vegetables" },
      { id: "60", name: "Ginger", amount: "2 tbsp", category: "Spices" },
      { id: "61", name: "Tomatoes", amount: "400g can", category: "Vegetables" },
      { id: "62", name: "Basmati Rice", amount: "2 cups", category: "Grains" },
    ],
    steps: [
      "Cut chicken into bite-sized pieces.",
      "Heat oil in a large pot and brown chicken pieces.",
      "Add diced onion, garlic, and ginger. Cook until fragrant.",
      "Stir in curry paste and cook for 1 minute.",
      "Add canned tomatoes and coconut milk.",
      "Simmer for 25-30 minutes until chicken is tender.",
      "Cook basmati rice according to package instructions.",
      "Serve curry over rice with fresh cilantro."
    ],
    isFavorite: true
  },
  {
    id: "9",
    name: "Margherita Pizza",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    cookTime: "30 min",
    servings: 4,
    category: "Italian",
    ingredients: [
      { id: "63", name: "Pizza Dough", amount: "1 ball", category: "Bread" },
      { id: "64", name: "Tomato Sauce", amount: "1/2 cup", category: "Condiments" },
      { id: "65", name: "Mozzarella", amount: "200g", category: "Dairy" },
      { id: "66", name: "Fresh Basil", amount: "1/4 cup", category: "Herbs" },
      { id: "67", name: "Olive Oil", amount: "2 tbsp", category: "Oils" },
      { id: "68", name: "Salt", amount: "to taste", category: "Spices" },
    ],
    steps: [
      "Preheat oven to 250°C (480°F).",
      "Roll out pizza dough on a floured surface.",
      "Transfer to a pizza stone or baking sheet.",
      "Spread tomato sauce evenly over dough.",
      "Tear mozzarella into pieces and distribute over sauce.",
      "Drizzle with olive oil and season with salt.",
      "Bake for 10-12 minutes until crust is golden.",
      "Top with fresh basil leaves before serving."
    ],
    isFavorite: false
  },
  {
    id: "10",
    name: "Beef Stew",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.5,
    cookTime: "2 hours",
    servings: 6,
    category: "Comfort Food",
    ingredients: [
      { id: "69", name: "Beef Chuck", amount: "1kg", category: "Meat" },
      { id: "70", name: "Potatoes", amount: "4", category: "Vegetables" },
      { id: "71", name: "Carrots", amount: "4", category: "Vegetables" },
      { id: "72", name: "Celery", amount: "3 stalks", category: "Vegetables" },
      { id: "73", name: "Onion", amount: "1", category: "Vegetables" },
      { id: "74", name: "Beef Broth", amount: "4 cups", category: "Condiments" },
      { id: "75", name: "Tomato Paste", amount: "2 tbsp", category: "Condiments" },
      { id: "76", name: "Thyme", amount: "1 tsp", category: "Herbs" },
    ],
    steps: [
      "Cut beef into 2-inch cubes and season with salt and pepper.",
      "Brown beef in a large pot with oil.",
      "Add diced onion and cook until softened.",
      "Stir in tomato paste and cook for 1 minute.",
      "Add beef broth and thyme, bring to a boil.",
      "Reduce heat and simmer covered for 1.5 hours.",
      "Add diced potatoes, carrots, and celery.",
      "Continue cooking for 30 minutes until vegetables are tender."
    ],
    isFavorite: false
  },
  {
    id: "11",
    name: "Pad Thai",
    image: "https://images.unsplash.com/photo-1559314809-0f31657def5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    cookTime: "25 min",
    servings: 4,
    category: "Thai",
    ingredients: [
      { id: "77", name: "Rice Noodles", amount: "200g", category: "Pasta" },
      { id: "78", name: "Shrimp", amount: "300g", category: "Seafood" },
      { id: "79", name: "Bean Sprouts", amount: "1 cup", category: "Vegetables" },
      { id: "80", name: "Eggs", amount: "2", category: "Dairy" },
      { id: "81", name: "Fish Sauce", amount: "3 tbsp", category: "Condiments" },
      { id: "82", name: "Tamarind Paste", amount: "2 tbsp", category: "Condiments" },
      { id: "83", name: "Palm Sugar", amount: "2 tbsp", category: "Sweeteners" },
      { id: "84", name: "Peanuts", amount: "1/4 cup", category: "Nuts" },
      { id: "85", name: "Lime", amount: "2", category: "Fruits" },
    ],
    steps: [
      "Soak rice noodles in warm water until soft.",
      "Heat oil in a wok over high heat.",
      "Add shrimp and cook until pink.",
      "Push shrimp to one side, scramble eggs on the other side.",
      "Add drained noodles and toss with shrimp and eggs.",
      "Mix fish sauce, tamarind paste, and palm sugar.",
      "Pour sauce over noodles and toss.",
      "Add bean sprouts and cook for 1 minute.",
      "Serve with crushed peanuts and lime wedges."
    ],
    isFavorite: true
  },
  {
    id: "12",
    name: "French Toast",
    image: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.3,
    cookTime: "15 min",
    servings: 4,
    category: "Breakfast",
    ingredients: [
      { id: "86", name: "Bread", amount: "8 slices", category: "Bread" },
      { id: "87", name: "Eggs", amount: "4", category: "Dairy" },
      { id: "88", name: "Milk", amount: "1/2 cup", category: "Dairy" },
      { id: "89", name: "Vanilla Extract", amount: "1 tsp", category: "Baking" },
      { id: "90", name: "Cinnamon", amount: "1/2 tsp", category: "Spices" },
      { id: "91", name: "Butter", amount: "2 tbsp", category: "Dairy" },
      { id: "92", name: "Maple Syrup", amount: "for serving", category: "Sweeteners" },
    ],
    steps: [
      "In a shallow dish, whisk together eggs, milk, vanilla, and cinnamon.",
      "Heat butter in a large skillet over medium heat.",
      "Dip each slice of bread in the egg mixture, coating both sides.",
      "Cook bread slices in the skillet for 2-3 minutes per side until golden.",
      "Serve hot with maple syrup and butter."
    ],
    isFavorite: false
  },
  {
    id: "13",
    name: "Chicken Parmesan",
    image: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    cookTime: "40 min",
    servings: 4,
    category: "Italian",
    ingredients: [
      { id: "93", name: "Chicken Breasts", amount: "4", category: "Meat" },
      { id: "94", name: "Breadcrumbs", amount: "1 cup", category: "Bread" },
      { id: "95", name: "Parmesan", amount: "1/2 cup", category: "Dairy" },
      { id: "96", name: "Eggs", amount: "2", category: "Dairy" },
      { id: "97", name: "Flour", amount: "1/2 cup", category: "Baking" },
      { id: "98", name: "Marinara Sauce", amount: "2 cups", category: "Condiments" },
      { id: "99", name: "Mozzarella", amount: "1 cup", category: "Dairy" },
      { id: "100", name: "Olive Oil", amount: "1/4 cup", category: "Oils" },
    ],
    steps: [
      "Preheat oven to 200°C (400°F).",
      "Pound chicken breasts to 1/2 inch thickness.",
      "Set up breading station: flour, beaten eggs, breadcrumbs mixed with parmesan.",
      "Bread chicken: flour, egg, breadcrumb mixture.",
      "Heat oil in a large skillet and brown chicken on both sides.",
      "Transfer chicken to a baking dish.",
      "Top with marinara sauce and mozzarella cheese.",
      "Bake for 20-25 minutes until cheese is melted and bubbly."
    ],
    isFavorite: true
  },
  {
    id: "14",
    name: "Mushroom Risotto",
    image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    cookTime: "35 min",
    servings: 4,
    category: "Italian",
    ingredients: [
      { id: "101", name: "Arborio Rice", amount: "1.5 cups", category: "Grains" },
      { id: "102", name: "Mushrooms", amount: "300g", category: "Vegetables" },
      { id: "103", name: "Vegetable Broth", amount: "6 cups", category: "Condiments" },
      { id: "104", name: "White Wine", amount: "1/2 cup", category: "Alcohol" },
      { id: "105", name: "Onion", amount: "1", category: "Vegetables" },
      { id: "106", name: "Garlic", amount: "2 cloves", category: "Vegetables" },
      { id: "107", name: "Parmesan", amount: "1/2 cup", category: "Dairy" },
      { id: "108", name: "Butter", amount: "3 tbsp", category: "Dairy" },
    ],
    steps: [
      "Heat broth in a saucepan and keep warm.",
      "Sauté sliced mushrooms in butter until golden. Set aside.",
      "In the same pan, cook diced onion and garlic until soft.",
      "Add rice and stir for 2 minutes until lightly toasted.",
      "Add wine and stir until absorbed.",
      "Add warm broth one ladle at a time, stirring constantly.",
      "Continue until rice is creamy and tender, about 20 minutes.",
      "Stir in mushrooms, parmesan, and remaining butter."
    ],
    isFavorite: false
  },
  {
    id: "15",
    name: "Fish and Chips",
    image: "https://images.unsplash.com/photo-1544982503-9f984c14501a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.4,
    cookTime: "45 min",
    servings: 4,
    category: "British",
    ingredients: [
      { id: "109", name: "White Fish Fillets", amount: "4", category: "Fish" },
      { id: "110", name: "Potatoes", amount: "4 large", category: "Vegetables" },
      { id: "111", name: "Flour", amount: "1 cup", category: "Baking" },
      { id: "112", name: "Beer", amount: "1 cup", category: "Alcohol" },
      { id: "113", name: "Baking Powder", amount: "1 tsp", category: "Baking" },
      { id: "114", name: "Vegetable Oil", amount: "for frying", category: "Oils" },
      { id: "115", name: "Salt", amount: "to taste", category: "Spices" },
      { id: "116", name: "Malt Vinegar", amount: "for serving", category: "Condiments" },
    ],
    steps: [
      "Cut potatoes into thick chips and soak in cold water.",
      "Heat oil to 180°C (350°F) in a deep fryer or large pot.",
      "Make batter by whisking flour, beer, baking powder, and salt.",
      "Pat fish fillets dry and season with salt.",
      "Fry chips for 4-5 minutes, remove and drain.",
      "Dip fish in batter and fry for 4-5 minutes until golden.",
      "Fry chips again for 2-3 minutes until crispy.",
      "Serve immediately with malt vinegar and mushy peas."
    ],
    isFavorite: false
  },
  {
    id: "16",
    name: "Banana Bread",
    image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.7,
    cookTime: "1 hour 15 min",
    servings: 8,
    category: "Dessert",
    ingredients: [
      { id: "117", name: "Ripe Bananas", amount: "3", category: "Fruits" },
      { id: "118", name: "Butter", amount: "75g", category: "Dairy" },
      { id: "119", name: "Sugar", amount: "150g", category: "Baking" },
      { id: "120", name: "Egg", amount: "1", category: "Dairy" },
      { id: "121", name: "Vanilla Extract", amount: "1 tsp", category: "Baking" },
      { id: "122", name: "Flour", amount: "175g", category: "Baking" },
      { id: "123", name: "Baking Soda", amount: "1 tsp", category: "Baking" },
      { id: "124", name: "Salt", amount: "1/2 tsp", category: "Spices" },
    ],
    steps: [
      "Preheat oven to 175°C (350°F). Grease a loaf pan.",
      "Mash bananas in a large bowl.",
      "Melt butter and mix with mashed bananas.",
      "Stir in sugar, egg, and vanilla.",
      "In a separate bowl, combine flour, baking soda, and salt.",
      "Add dry ingredients to banana mixture and stir until just combined.",
      "Pour into prepared loaf pan.",
      "Bake for 60-65 minutes until a toothpick comes out clean."
    ],
    isFavorite: false
  },
  {
    id: "17",
    name: "Chicken Tikka Masala",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.9,
    cookTime: "1 hour",
    servings: 6,
    category: "Indian",
    ingredients: [
      { id: "125", name: "Chicken Breast", amount: "1kg", category: "Meat" },
      { id: "126", name: "Yogurt", amount: "1 cup", category: "Dairy" },
      { id: "127", name: "Heavy Cream", amount: "1 cup", category: "Dairy" },
      { id: "128", name: "Tomato Sauce", amount: "400g can", category: "Condiments" },
      { id: "129", name: "Garam Masala", amount: "2 tsp", category: "Spices" },
      { id: "130", name: "Cumin", amount: "1 tsp", category: "Spices" },
      { id: "131", name: "Paprika", amount: "1 tsp", category: "Spices" },
      { id: "132", name: "Ginger", amount: "2 tbsp", category: "Spices" },
      { id: "133", name: "Garlic", amount: "4 cloves", category: "Vegetables" },
    ],
    steps: [
      "Cut chicken into bite-sized pieces.",
      "Marinate chicken in yogurt, ginger, garlic, and spices for 30 minutes.",
      "Cook marinated chicken in a large pan until browned.",
      "Remove chicken and set aside.",
      "In the same pan, add tomato sauce and simmer for 10 minutes.",
      "Add heavy cream and remaining spices.",
      "Return chicken to the pan and simmer for 15 minutes.",
      "Serve with basmati rice and naan bread."
    ],
    isFavorite: true
  },
  {
    id: "18",
    name: "Pancakes",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.5,
    cookTime: "20 min",
    servings: 4,
    category: "Breakfast",
    ingredients: [
      { id: "134", name: "Flour", amount: "2 cups", category: "Baking" },
      { id: "135", name: "Sugar", amount: "2 tbsp", category: "Baking" },
      { id: "136", name: "Baking Powder", amount: "2 tsp", category: "Baking" },
      { id: "137", name: "Salt", amount: "1/2 tsp", category: "Spices" },
      { id: "138", name: "Milk", amount: "1.5 cups", category: "Dairy" },
      { id: "139", name: "Eggs", amount: "2", category: "Dairy" },
      { id: "140", name: "Butter", amount: "3 tbsp", category: "Dairy" },
      { id: "141", name: "Vanilla Extract", amount: "1 tsp", category: "Baking" },
    ],
    steps: [
      "In a large bowl, whisk together flour, sugar, baking powder, and salt.",
      "In another bowl, whisk together milk, eggs, melted butter, and vanilla.",
      "Pour wet ingredients into dry ingredients and stir until just combined.",
      "Heat a griddle or large skillet over medium heat.",
      "Pour 1/4 cup batter for each pancake onto the griddle.",
      "Cook until bubbles form on surface, then flip and cook until golden.",
      "Serve hot with maple syrup and butter."
    ],
    isFavorite: false
  },
  {
    id: "19",
    name: "Beef Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.6,
    cookTime: "25 min",
    servings: 4,
    category: "American",
    ingredients: [
      { id: "142", name: "Ground Beef", amount: "500g", category: "Meat" },
      { id: "143", name: "Burger Buns", amount: "4", category: "Bread" },
      { id: "144", name: "Lettuce", amount: "4 leaves", category: "Vegetables" },
      { id: "145", name: "Tomato", amount: "1", category: "Vegetables" },
      { id: "146", name: "Onion", amount: "1", category: "Vegetables" },
      { id: "147", name: "Cheese Slices", amount: "4", category: "Dairy" },
      { id: "148", name: "Ketchup", amount: "to taste", category: "Condiments" },
      { id: "149", name: "Mustard", amount: "to taste", category: "Condiments" },
    ],
    steps: [
      "Form ground beef into 4 patties and season with salt and pepper.",
      "Heat a grill or skillet over medium-high heat.",
      "Cook patties for 4-5 minutes per side for medium doneness.",
      "Add cheese slices in the last minute of cooking.",
      "Toast burger buns lightly.",
      "Slice tomato and onion.",
      "Assemble burgers with lettuce, tomato, onion, and condiments.",
      "Serve with french fries or potato chips."
    ],
    isFavorite: false
  },
  {
    id: "20",
    name: "Chocolate Cake",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    rating: 4.8,
    cookTime: "1 hour 30 min",
    servings: 12,
    category: "Dessert",
    ingredients: [
      { id: "150", name: "Flour", amount: "2 cups", category: "Baking" },
      { id: "151", name: "Cocoa Powder", amount: "3/4 cup", category: "Baking" },
      { id: "152", name: "Sugar", amount: "2 cups", category: "Baking" },
      { id: "153", name: "Eggs", amount: "2", category: "Dairy" },
      { id: "154", name: "Milk", amount: "1 cup", category: "Dairy" },
      { id: "155", name: "Vegetable Oil", amount: "1/2 cup", category: "Oils" },
      { id: "156", name: "Baking Soda", amount: "2 tsp", category: "Baking" },
      { id: "157", name: "Vanilla Extract", amount: "2 tsp", category: "Baking" },
    ],
    steps: [
      "Preheat oven to 175°C (350°F). Grease two 9-inch cake pans.",
      "In a large bowl, combine flour, cocoa, sugar, and baking soda.",
      "In another bowl, whisk together eggs, milk, oil, and vanilla.",
      "Add wet ingredients to dry ingredients and mix until smooth.",
      "Divide batter between prepared pans.",
      "Bake for 30-35 minutes until a toothpick comes out clean.",
      "Cool completely before frosting.",
      "Frost with chocolate buttercream or your favorite frosting."
    ],
    isFavorite: true
  },

  { id: "21", name: "Lasagne Bolognese", image: "https://images.unsplash.com/photo-1604908177071-052c4d5d8f2a?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "1 h", servings: 6, category: "Italian", course: "Hauptspeise", ingredients: [
    { id: "158", name: "Lasagne Sheets", amount: "12", category: "Pasta" },
    { id: "159", name: "Ground Beef", amount: "600g", category: "Meat" },
    { id: "160", name: "Tomato Sauce", amount: "800g", category: "Condiments" },
    { id: "161", name: "Onion", amount: "1", category: "Vegetables" },
    { id: "162", name: "Garlic", amount: "3 cloves", category: "Vegetables" },
    { id: "163", name: "Mozzarella", amount: "200g", category: "Dairy" },
    { id: "164", name: "Parmesan", amount: "60g", category: "Dairy" },
    { id: "165", name: "Olive Oil", amount: "2 tbsp", category: "Oils" },
  ], steps: [
    "Cook beef with onion and garlic, add tomato sauce and simmer.",
    "Layer sauce, sheets, and cheese in a baking dish.",
    "Bake at 190°C for 35-40 minutes until bubbly.",
  ], isFavorite: false },

  { id: "22", name: "Bruschetta", image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "15 min", servings: 4, category: "Italian", course: "Vorspeise", ingredients: [
    { id: "166", name: "Baguette", amount: "1", category: "Bread" },
    { id: "167", name: "Tomatoes", amount: "4", category: "Vegetables" },
    { id: "168", name: "Basil", amount: "1/4 cup", category: "Herbs" },
    { id: "169", name: "Garlic", amount: "1 clove", category: "Vegetables" },
    { id: "170", name: "Olive Oil", amount: "2 tbsp", category: "Oils" },
  ], steps: [
    "Toast baguette slices.",
    "Top with chopped tomatoes, basil, garlic and olive oil.",
  ], isFavorite: false },

  { id: "23", name: "Tiramisu", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476f?auto=format&fit=crop&w=800&q=80", rating: 4.9, cookTime: "30 min + chill", servings: 8, category: "Dessert", course: "Nachspeise", ingredients: [
    { id: "171", name: "Ladyfingers", amount: "250g", category: "Baking" },
    { id: "172", name: "Mascarpone", amount: "500g", category: "Dairy" },
    { id: "173", name: "Espresso", amount: "200ml", category: "Beverages" },
    { id: "174", name: "Cocoa Powder", amount: "2 tbsp", category: "Baking" },
    { id: "175", name: "Sugar", amount: "100g", category: "Baking" },
    { id: "176", name: "Eggs", amount: "3", category: "Dairy" },
  ], steps: [
    "Whip yolks with sugar, fold in mascarpone and whipped whites.",
    "Dip ladyfingers in espresso, layer with cream.",
    "Dust with cocoa and chill 4 hours.",
  ], isFavorite: true },

  { id: "24", name: "Caprese Salad", image: "https://images.unsplash.com/photo-1523983302171-0379d9d3f0cf?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "10 min", servings: 2, category: "Italian", course: "Vorspeise", ingredients: [
    { id: "177", name: "Tomatoes", amount: "3", category: "Vegetables" },
    { id: "178", name: "Mozzarella", amount: "200g", category: "Dairy" },
    { id: "179", name: "Basil", amount: "handful", category: "Herbs" },
    { id: "180", name: "Olive Oil", amount: "1 tbsp", category: "Oils" },
  ], steps: [
    "Slice tomatoes and mozzarella.",
    "Arrange with basil, drizzle oil, season.",
  ], isFavorite: false },

  { id: "25", name: "Ramen", image: "https://images.unsplash.com/photo-1543357480-c60d40007a70?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "45 min", servings: 2, category: "Japanese", course: "Hauptspeise", ingredients: [
    { id: "181", name: "Ramen Noodles", amount: "2 packs", category: "Pasta" },
    { id: "182", name: "Pork Belly", amount: "200g", category: "Meat" },
    { id: "183", name: "Soy Sauce", amount: "3 tbsp", category: "Condiments" },
    { id: "184", name: "Miso", amount: "2 tbsp", category: "Condiments" },
    { id: "185", name: "Egg", amount: "2", category: "Dairy" },
    { id: "186", name: "Spring Onion", amount: "2", category: "Vegetables" },
  ], steps: [
    "Simmer broth with soy and miso.",
    "Cook noodles, top with pork, egg, onions.",
  ], isFavorite: true },

  { id: "26", name: "Sushi Rolls", image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "50 min", servings: 4, category: "Japanese", course: "Hauptspeise", ingredients: [
    { id: "187", name: "Sushi Rice", amount: "2 cups", category: "Grains" },
    { id: "188", name: "Nori", amount: "8 sheets", category: "Miscellaneous" },
    { id: "189", name: "Salmon", amount: "200g", category: "Seafood" },
    { id: "190", name: "Cucumber", amount: "1", category: "Vegetables" },
    { id: "191", name: "Rice Vinegar", amount: "3 tbsp", category: "Condiments" },
  ], steps: [
    "Cook rice, season with vinegar.",
    "Roll with fillings in nori and slice.",
  ], isFavorite: false },

  { id: "27", name: "General Tso's Chicken", image: "https://images.unsplash.com/photo-1625944527410-5a1a1e7c7b15?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "35 min", servings: 4, category: "Chinese", course: "Hauptspeise", ingredients: [
    { id: "192", name: "Chicken Thighs", amount: "600g", category: "Meat" },
    { id: "193", name: "Cornstarch", amount: "1/2 cup", category: "Baking" },
    { id: "194", name: "Soy Sauce", amount: "4 tbsp", category: "Condiments" },
    { id: "195", name: "Rice Vinegar", amount: "2 tbsp", category: "Condiments" },
    { id: "196", name: "Chili", amount: "1 tsp", category: "Spices" },
  ], steps: [
    "Coat chicken, fry until crisp.",
    "Toss with sweet-spicy sauce.",
  ], isFavorite: false },

  { id: "28", name: "Butter Chicken", image: "https://images.unsplash.com/photo-1645119739916-38a9b953bb4c?auto=format&fit=crop&w=800&q=80", rating: 4.9, cookTime: "50 min", servings: 4, category: "Indian", course: "Hauptspeise", ingredients: [
    { id: "197", name: "Chicken Breast", amount: "700g", category: "Meat" },
    { id: "198", name: "Butter", amount: "80g", category: "Dairy" },
    { id: "199", name: "Tomato Puree", amount: "400g", category: "Condiments" },
    { id: "200", name: "Cream", amount: "150ml", category: "Dairy" },
    { id: "201", name: "Garam Masala", amount: "2 tsp", category: "Spices" },
  ], steps: [
    "Brown chicken, add sauce and cream, simmer.",
    "Serve with rice and naan.",
  ], isFavorite: true },

  { id: "29", name: "Chana Masala", image: "https://images.unsplash.com/photo-1604908812358-3bec8343b9a5?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "35 min", servings: 4, category: "Indian", course: "Hauptspeise", ingredients: [
    { id: "202", name: "Chickpeas", amount: "2 cans", category: "Vegetables" },
    { id: "203", name: "Onion", amount: "1", category: "Vegetables" },
    { id: "204", name: "Tomatoes", amount: "400g", category: "Vegetables" },
    { id: "205", name: "Garam Masala", amount: "1 tbsp", category: "Spices" },
    { id: "206", name: "Cumin", amount: "1 tsp", category: "Spices" },
  ], steps: [
    "Cook onions, add spices and tomatoes.",
    "Add chickpeas and simmer.",
  ], isFavorite: false },

  { id: "30", name: "Guacamole", image: "https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=800&q=80", rating: 4.8, cookTime: "10 min", servings: 4, category: "Mexican", course: "Vorspeise", ingredients: [
    { id: "207", name: "Avocados", amount: "3", category: "Fruits" },
    { id: "208", name: "Lime", amount: "1", category: "Fruits" },
    { id: "209", name: "Red Onion", amount: "1/2", category: "Vegetables" },
    { id: "210", name: "Cilantro", amount: "2 tbsp", category: "Herbs" },
    { id: "211", name: "Salt", amount: "to taste", category: "Spices" },
  ], steps: [
    "Mash avocado, stir in diced onion, cilantro, lime, salt.",
  ], isFavorite: true },

  { id: "31", name: "Chicken Enchiladas", image: "https://images.unsplash.com/photo-1543332164-6e82f355bad8?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "45 min", servings: 4, category: "Mexican", course: "Hauptspeise", ingredients: [
    { id: "212", name: "Tortillas", amount: "8", category: "Bread" },
    { id: "213", name: "Chicken", amount: "500g", category: "Meat" },
    { id: "214", name: "Enchilada Sauce", amount: "2 cups", category: "Condiments" },
    { id: "215", name: "Cheddar", amount: "200g", category: "Dairy" },
    { id: "216", name: "Onion", amount: "1", category: "Vegetables" },
  ], steps: [
    "Fill tortillas with chicken and cheese.",
    "Top with sauce and bake 20 minutes.",
  ], isFavorite: false },

  { id: "32", name: "Greek Moussaka", image: "https://images.unsplash.com/photo-1604908554026-2c3f3b8f106b?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "1 h 15 min", servings: 6, category: "Greek", course: "Hauptspeise", ingredients: [
    { id: "217", name: "Eggplants", amount: "3", category: "Vegetables" },
    { id: "218", name: "Ground Lamb", amount: "600g", category: "Meat" },
    { id: "219", name: "Tomato Sauce", amount: "500g", category: "Condiments" },
    { id: "220", name: "Bechamel", amount: "500ml", category: "Dairy" },
  ], steps: [
    "Layer fried eggplant with meat sauce and bechamel.",
    "Bake until golden.",
  ], isFavorite: true },

  { id: "33", name: "Greek Souvlaki", image: "https://images.unsplash.com/photo-1606931960731-4e9a9d54e07a?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "30 min", servings: 4, category: "Greek", course: "Hauptspeise", ingredients: [
    { id: "221", name: "Pork", amount: "600g", category: "Meat" },
    { id: "222", name: "Pita", amount: "4", category: "Bread" },
    { id: "223", name: "Tzatziki", amount: "1 cup", category: "Condiments" },
    { id: "224", name: "Onion", amount: "1", category: "Vegetables" },
  ], steps: [
    "Grill marinated pork skewers.",
    "Serve in pita with tzatziki and onions.",
  ], isFavorite: false },

  { id: "34", name: "Cobb Salad", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", rating: 4.4, cookTime: "20 min", servings: 2, category: "American", course: "Vorspeise", ingredients: [
    { id: "225", name: "Romaine", amount: "1 head", category: "Vegetables" },
    { id: "226", name: "Chicken", amount: "150g", category: "Meat" },
    { id: "227", name: "Avocado", amount: "1", category: "Fruits" },
    { id: "228", name: "Bacon", amount: "4 slices", category: "Meat" },
    { id: "229", name: "Egg", amount: "1", category: "Dairy" },
    { id: "230", name: "Blue Cheese", amount: "30g", category: "Dairy" },
  ], steps: [
    "Arrange ingredients over lettuce, dress and serve.",
  ], isFavorite: false },

  { id: "35", name: "Clam Chowder", image: "https://images.unsplash.com/photo-1625944528304-7b66b74fd9f1?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "40 min", servings: 4, category: "American", course: "Hauptspeise", ingredients: [
    { id: "231", name: "Clams", amount: "400g", category: "Seafood" },
    { id: "232", name: "Potatoes", amount: "3", category: "Vegetables" },
    { id: "233", name: "Cream", amount: "250ml", category: "Dairy" },
    { id: "234", name: "Onion", amount: "1", category: "Vegetables" },
    { id: "235", name: "Bacon", amount: "100g", category: "Meat" },
  ], steps: [
    "Cook bacon and onions, add clams, potatoes, cream and simmer.",
  ], isFavorite: true },

  { id: "36", name: "Fish Tacos", image: "https://images.unsplash.com/photo-1548943487-a2e4e43b4856?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "25 min", servings: 4, category: "Mexican", course: "Hauptspeise", ingredients: [
    { id: "236", name: "White Fish", amount: "500g", category: "Fish" },
    { id: "237", name: "Tortillas", amount: "8", category: "Bread" },
    { id: "238", name: "Cabbage", amount: "2 cups", category: "Vegetables" },
    { id: "239", name: "Lime", amount: "1", category: "Fruits" },
    { id: "240", name: "Crema", amount: "1/2 cup", category: "Dairy" },
  ], steps: [
    "Cook fish with spices, assemble tacos with slaw and crema.",
  ], isFavorite: false },

  { id: "37", name: "Pesto Pasta", image: "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "20 min", servings: 2, category: "Italian", course: "Hauptspeise", ingredients: [
    { id: "241", name: "Pasta", amount: "250g", category: "Pasta" },
    { id: "242", name: "Basil Pesto", amount: "4 tbsp", category: "Condiments" },
    { id: "243", name: "Parmesan", amount: "40g", category: "Dairy" },
    { id: "244", name: "Pine Nuts", amount: "2 tbsp", category: "Nuts" },
  ], steps: [
    "Cook pasta, toss with pesto, top with parmesan and nuts.",
  ], isFavorite: true },

  { id: "38", name: "Shakshuka", image: "https://images.unsplash.com/photo-1604908554026-6e01b1c8b9a1?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "30 min", servings: 3, category: "Mediterranean", course: "Hauptspeise", ingredients: [
    { id: "245", name: "Eggs", amount: "4", category: "Dairy" },
    { id: "246", name: "Tomatoes", amount: "500g", category: "Vegetables" },
    { id: "247", name: "Bell Pepper", amount: "1", category: "Vegetables" },
    { id: "248", name: "Onion", amount: "1", category: "Vegetables" },
    { id: "249", name: "Cumin", amount: "1 tsp", category: "Spices" },
  ], steps: [
    "Simmer peppers, onions, tomatoes with spices.",
    "Poach eggs in sauce.",
  ], isFavorite: false },

  { id: "39", name: "Falafel Wrap", image: "https://images.unsplash.com/photo-1612874742193-8a1e9d5946b4?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "35 min", servings: 4, category: "Mediterranean", course: "Hauptspeise", ingredients: [
    { id: "250", name: "Chickpeas", amount: "400g", category: "Vegetables" },
    { id: "251", name: "Parsley", amount: "1/2 cup", category: "Herbs" },
    { id: "252", name: "Garlic", amount: "2 cloves", category: "Vegetables" },
    { id: "253", name: "Flour", amount: "2 tbsp", category: "Baking" },
    { id: "254", name: "Wraps", amount: "4", category: "Bread" },
  ], steps: [
    "Blend falafel mix, fry balls, assemble wraps with tahini.",
  ], isFavorite: false },

  { id: "40", name: "Avocado Toast", image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=800&q=80", rating: 4.3, cookTime: "10 min", servings: 1, category: "Breakfast", course: "Vorspeise", ingredients: [
    { id: "255", name: "Bread", amount: "2 slices", category: "Bread" },
    { id: "256", name: "Avocado", amount: "1/2", category: "Fruits" },
    { id: "257", name: "Lemon", amount: "1 wedge", category: "Fruits" },
    { id: "258", name: "Chili Flakes", amount: "pinch", category: "Spices" },
  ], steps: [
    "Toast bread, mash avocado with lemon, spread and top with chili.",
  ], isFavorite: false },

  { id: "41", name: "French Omelette", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", rating: 4.6, cookTime: "8 min", servings: 1, category: "Breakfast", course: "Vorspeise", ingredients: [
    { id: "259", name: "Eggs", amount: "3", category: "Dairy" },
    { id: "260", name: "Butter", amount: "1 tbsp", category: "Dairy" },
    { id: "261", name: "Chives", amount: "1 tbsp", category: "Herbs" },
  ], steps: [
    "Whisk eggs, cook gently in butter, roll and garnish with chives.",
  ], isFavorite: true },

  { id: "42", name: "Cheesecake", image: "https://images.unsplash.com/photo-1541781286675-09d7b3a56f38?auto=format&fit=crop&w=800&q=80", rating: 4.9, cookTime: "1 h + chill", servings: 12, category: "Dessert", course: "Nachspeise", ingredients: [
    { id: "262", name: "Cream Cheese", amount: "600g", category: "Dairy" },
    { id: "263", name: "Sugar", amount: "150g", category: "Baking" },
    { id: "264", name: "Eggs", amount: "3", category: "Dairy" },
    { id: "265", name: "Graham Crumbs", amount: "200g", category: "Baking" },
    { id: "266", name: "Butter", amount: "80g", category: "Dairy" },
  ], steps: [
    "Press crust, bake briefly, pour filling, bake until set, chill.",
  ], isFavorite: true },

  { id: "43", name: "Pavlova", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80", rating: 4.8, cookTime: "1 h 20 min", servings: 8, category: "Dessert", course: "Nachspeise", ingredients: [
    { id: "267", name: "Egg Whites", amount: "4", category: "Dairy" },
    { id: "268", name: "Sugar", amount: "200g", category: "Baking" },
    { id: "269", name: "Cornstarch", amount: "1 tsp", category: "Baking" },
    { id: "270", name: "Cream", amount: "200ml", category: "Dairy" },
    { id: "271", name: "Berries", amount: "200g", category: "Fruits" },
  ], steps: [
    "Beat whites and sugar, bake meringue, top with cream and berries.",
  ], isFavorite: false },

  { id: "44", name: "Fish Curry", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "35 min", servings: 4, category: "Indian", course: "Hauptspeise", ingredients: [
    { id: "272", name: "White Fish", amount: "500g", category: "Fish" },
    { id: "273", name: "Coconut Milk", amount: "400ml", category: "Dairy" },
    { id: "274", name: "Curry Leaves", amount: "8", category: "Herbs" },
    { id: "275", name: "Turmeric", amount: "1 tsp", category: "Spices" },
  ], steps: [
    "Simmer sauce, add fish and cook gently until done.",
  ], isFavorite: false },

  { id: "45", name: "Cauliflower Tacos", image: "https://images.unsplash.com/photo-1543339308-43f2d6cfeae9?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "30 min", servings: 4, category: "Mexican", course: "Hauptspeise", ingredients: [
    { id: "276", name: "Cauliflower", amount: "1 head", category: "Vegetables" },
    { id: "277", name: "Tortillas", amount: "8", category: "Bread" },
    { id: "278", name: "Chipotle", amount: "1 tsp", category: "Spices" },
    { id: "279", name: "Lime", amount: "1", category: "Fruits" },
  ], steps: [
    "Roast cauliflower with spices, assemble tacos.",
  ], isFavorite: true },

  { id: "46", name: "Miso Salmon", image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80", rating: 4.8, cookTime: "20 min", servings: 2, category: "Japanese", course: "Hauptspeise", ingredients: [
    { id: "280", name: "Salmon", amount: "2 fillets", category: "Seafood" },
    { id: "281", name: "Miso", amount: "2 tbsp", category: "Condiments" },
    { id: "282", name: "Mirin", amount: "1 tbsp", category: "Condiments" },
    { id: "283", name: "Soy Sauce", amount: "1 tbsp", category: "Condiments" },
  ], steps: [
    "Marinate salmon, bake 12 minutes at 200°C.",
  ], isFavorite: false },

  { id: "47", name: "Tom Kha Gai", image: "https://images.unsplash.com/photo-1604908554670-28e0122972a7?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "30 min", servings: 4, category: "Thai", course: "Hauptspeise", ingredients: [
    { id: "284", name: "Chicken", amount: "400g", category: "Meat" },
    { id: "285", name: "Coconut Milk", amount: "400ml", category: "Dairy" },
    { id: "286", name: "Lemongrass", amount: "2 stalks", category: "Herbs" },
    { id: "287", name: "Galangal", amount: "4 slices", category: "Spices" },
    { id: "288", name: "Mushrooms", amount: "150g", category: "Vegetables" },
  ], steps: [
    "Simmer aromatics in coconut milk, add chicken and mushrooms.",
  ], isFavorite: true },

  { id: "48", name: "Spring Rolls", image: "https://images.unsplash.com/photo-1496116218417-1a781b1c4162?auto=format&fit=crop&w=800&q=80", rating: 4.4, cookTime: "25 min", servings: 4, category: "Asian", course: "Vorspeise", ingredients: [
    { id: "289", name: "Rice Paper", amount: "12", category: "Miscellaneous" },
    { id: "290", name: "Shrimp", amount: "200g", category: "Seafood" },
    { id: "291", name: "Vermicelli", amount: "100g", category: "Pasta" },
    { id: "292", name: "Mint", amount: "1/4 cup", category: "Herbs" },
    { id: "293", name: "Lettuce", amount: "6 leaves", category: "Vegetables" },
  ], steps: [
    "Soak papers, fill with herbs, noodles, shrimp, roll and serve with dip.",
  ], isFavorite: false },

  { id: "49", name: "BBQ Ribs", image: "https://images.unsplash.com/photo-1558036117-15d82a90b9b8?auto=format&fit=crop&w=800&q=80", rating: 4.7, cookTime: "2 h", servings: 4, category: "American", course: "Hauptspeise", ingredients: [
    { id: "294", name: "Pork Ribs", amount: "1.5kg", category: "Meat" },
    { id: "295", name: "BBQ Sauce", amount: "1 cup", category: "Condiments" },
    { id: "296", name: "Brown Sugar", amount: "2 tbsp", category: "Baking" },
    { id: "297", name: "Paprika", amount: "1 tbsp", category: "Spices" },
  ], steps: [
    "Rub ribs, bake low and slow, glaze with BBQ sauce.",
  ], isFavorite: true },

  { id: "50", name: "Fish Pie", image: "https://images.unsplash.com/photo-1551183053-f69e0e6f6c9f?auto=format&fit=crop&w=800&q=80", rating: 4.5, cookTime: "1 h", servings: 6, category: "British", course: "Hauptspeise", ingredients: [
    { id: "298", name: "Mixed Fish", amount: "600g", category: "Fish" },
    { id: "299", name: "Potatoes", amount: "1kg", category: "Vegetables" },
    { id: "300", name: "Milk", amount: "400ml", category: "Dairy" },
    { id: "301", name: "Butter", amount: "60g", category: "Dairy" },
    { id: "302", name: "Flour", amount: "2 tbsp", category: "Baking" },
  ], steps: [
    "Make creamy fish filling, top with mash, bake until golden.",
  ], isFavorite: false },
];