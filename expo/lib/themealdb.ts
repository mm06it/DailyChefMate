import { Recipe, Ingredient } from '@/types/recipe';

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strDrinkAlternate?: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
}

interface MealDBResponse {
  meals: MealDBMeal[] | null;
}

class TheMealDBService {
  private baseUrl = 'https://www.themealdb.com/api/json/v1/1';

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async searchMealsByName(query: string): Promise<Recipe[]> {
    try {
      console.log('Searching TheMealDB for:', query);
      
      // Try direct search first
      let results = await this.performSearch(query);
      
      // If no results, try with alternative terms
      if (results.length === 0) {
        const alternatives = this.getAlternativeSearchTerms(query);
        for (const alternative of alternatives) {
          console.log('Trying alternative search term:', alternative);
          results = await this.performSearch(alternative);
          if (results.length > 0) break;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching TheMealDB:', error);
      return [];
    }
  }

  private async performSearch(query: string): Promise<Recipe[]> {
    const response = await fetch(`${this.baseUrl}/search.php?s=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: MealDBResponse = await response.json();
    
    if (!data.meals) {
      console.log('No meals found for query:', query);
      return [];
    }
    
    return data.meals.map(meal => this.convertMealToRecipe(meal));
  }

  private getAlternativeSearchTerms(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const alternatives: string[] = [];
    
    // German/Austrian to English translations for common dishes
    const translations: { [key: string]: string[] } = {
      // Austrian specialties
      'kaiserschmarrn': ['pancake', 'austrian pancake', 'shredded pancake'],
      'wiener schnitzel': ['schnitzel', 'veal cutlet', 'breaded cutlet'],
      'schnitzel': ['schnitzel', 'cutlet', 'breaded cutlet'],
      'apfelstrudel': ['strudel', 'apple strudel', 'pastry'],
      'sachertorte': ['chocolate cake', 'torte', 'austrian cake'],
      'tafelspitz': ['boiled beef', 'beef', 'austrian beef'],
      'goulash': ['goulash', 'beef stew', 'hungarian goulash'],
      'gulasch': ['goulash', 'beef stew', 'hungarian goulash'],
      'knödel': ['dumplings', 'bread dumplings', 'austrian dumplings'],
      'semmelknödel': ['bread dumplings', 'dumplings'],
      'leberknödel': ['liver dumplings', 'dumplings', 'soup dumplings'],
      'zwiebelrostbraten': ['beef', 'roast beef', 'onion beef'],
      'backhendl': ['fried chicken', 'chicken', 'austrian chicken'],
      'beuschel': ['veal', 'ragout', 'austrian veal'],
      'erdäpfelgulasch': ['potato goulash', 'potato stew', 'vegetarian goulash'],
      'palatschinken': ['crepes', 'pancakes', 'austrian crepes'],
      'topfenstrudel': ['cheese strudel', 'strudel', 'cottage cheese pastry'],
      'mohnnudeln': ['poppy seed noodles', 'pasta', 'sweet pasta'],
      'germknödel': ['yeast dumplings', 'sweet dumplings', 'plum dumplings'],
      'marillenknödel': ['apricot dumplings', 'fruit dumplings', 'sweet dumplings'],
      'salzburger nockerl': ['souffle', 'dessert', 'austrian dessert'],
      'linzer torte': ['linzer cake', 'jam tart', 'austrian tart'],
      'esterhazy torte': ['layered cake', 'hungarian cake', 'torte'],
      'vanillekipferl': ['vanilla crescents', 'cookies', 'austrian cookies'],
      'lebkuchen': ['gingerbread', 'cookies', 'spiced cookies'],
      
      // German dishes
      'sauerbraten': ['pot roast', 'beef roast', 'marinated beef'],
      'bratwurst': ['sausage', 'german sausage', 'grilled sausage'],
      'sauerkraut': ['cabbage', 'pickled cabbage', 'fermented cabbage'],
      'spätzle': ['noodles', 'german noodles', 'egg noodles'],
      'strudel': ['strudel', 'pastry', 'rolled pastry'],
      'currywurst': ['curry sausage', 'sausage', 'german street food'],
      'döner': ['kebab', 'turkish kebab', 'doner kebab'],
      'rouladen': ['beef rolls', 'beef roulade', 'stuffed beef'],
      'hackbraten': ['meatloaf', 'ground beef', 'german meatloaf'],
      'kartoffelpuffer': ['potato pancakes', 'hash browns', 'potato fritters'],
      'königsberger klopse': ['meatballs', 'swedish meatballs', 'german meatballs'],
      'himmel und erde': ['mashed potatoes', 'potato dish', 'sausage and potatoes'],
      'flammkuchen': ['pizza', 'flatbread', 'tarte flambee'],
      'maultaschen': ['ravioli', 'dumplings', 'german ravioli'],
      'weisswurst': ['white sausage', 'sausage', 'bavarian sausage'],
      'leberwurst': ['liver sausage', 'pate', 'liverwurst'],
      'schweinshaxe': ['pork knuckle', 'pork', 'roasted pork'],
      'rindsgulasch': ['beef goulash', 'goulash', 'beef stew']
    };
    
    // Check for exact matches first
    for (const [german, english] of Object.entries(translations)) {
      if (lowerQuery.includes(german)) {
        alternatives.push(...english);
      }
    }
    
    // If no translations found, try partial matches and common food terms
    if (alternatives.length === 0) {
      // Try removing common German prefixes/suffixes
      let simplified = lowerQuery
        .replace(/^(der|die|das|ein|eine)\s+/, '') // Remove articles
        .replace(/(chen|lein)$/, '') // Remove diminutive suffixes
        .replace(/wurst$/, 'sausage') // Replace wurst with sausage
        .replace(/kuchen$/, 'cake') // Replace kuchen with cake
        .replace(/suppe$/, 'soup'); // Replace suppe with soup
      
      if (simplified !== lowerQuery) {
        alternatives.push(simplified);
      }
      
      // Add generic food category searches
      if (lowerQuery.includes('fleisch') || lowerQuery.includes('meat')) {
        alternatives.push('beef', 'chicken', 'pork');
      }
      if (lowerQuery.includes('fisch') || lowerQuery.includes('fish')) {
        alternatives.push('fish', 'salmon', 'tuna');
      }
      if (lowerQuery.includes('gemüse') || lowerQuery.includes('vegetable')) {
        alternatives.push('vegetable', 'vegetarian');
      }
    }
    
    return alternatives.slice(0, 3); // Limit to 3 alternatives to avoid too many requests
  }

  async getRandomMeals(count: number = 5): Promise<Recipe[]> {
    try {
      console.log('Fetching random meals from TheMealDB');
      const promises = Array(count).fill(null).map(() => 
        fetch(`${this.baseUrl}/random.php`).then(res => res.json())
      );
      
      const responses: MealDBResponse[] = await Promise.all(promises);
      const recipes: Recipe[] = [];
      
      responses.forEach(data => {
        if (data.meals && data.meals[0]) {
          recipes.push(this.convertMealToRecipe(data.meals[0]));
        }
      });
      
      return recipes;
    } catch (error) {
      console.error('Error fetching random meals:', error);
      return [];
    }
  }

  // filter.php only returns id/name/thumb (+ area), always in the same order.
  // Shuffle, take a handful, then hydrate each with lookup.php for full detail.
  private async filterAndHydrate(param: 'c' | 'a' | 'i', value: string, take: number): Promise<Recipe[]> {
    const response = await fetch(`${this.baseUrl}/filter.php?${param}=${encodeURIComponent(value)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: MealDBResponse = await response.json();
    if (!data.meals) {
      return [];
    }
    const detailedMeals = await Promise.all(
      this.shuffle(data.meals).slice(0, take).map(async (meal) => {
        try {
          const detailResponse = await fetch(`${this.baseUrl}/lookup.php?i=${meal.idMeal}`);
          const detailData: MealDBResponse = await detailResponse.json();
          return detailData.meals?.[0] || meal;
        } catch {
          return meal;
        }
      })
    );
    return detailedMeals.map((meal) => this.convertMealToRecipe(meal));
  }

  async getMealsByCategory(category: string): Promise<Recipe[]> {
    try {
      console.log('Searching TheMealDB by category:', category);
      return await this.filterAndHydrate('c', category, 10);
    } catch (error) {
      console.error('Error searching by category:', error);
      return [];
    }
  }

  async getMealsByArea(area: string): Promise<Recipe[]> {
    try {
      console.log('Searching TheMealDB by area:', area);
      return await this.filterAndHydrate('a', area, 10);
    } catch (error) {
      console.error('Error searching by area:', error);
      return [];
    }
  }

  async getMealsByIngredient(ingredient: string): Promise<Recipe[]> {
    try {
      console.log('Searching TheMealDB by ingredient:', ingredient);
      return await this.filterAndHydrate('i', ingredient, 8);
    } catch (error) {
      console.error('Error searching by ingredient:', error);
      return [];
    }
  }

  private convertMealToRecipe(meal: MealDBMeal): Recipe {
    const ingredients = this.extractIngredients(meal);
    const steps = this.extractSteps(meal.strInstructions);
    
    // Estimate cooking time based on instructions length and complexity
    const cookTime = this.estimateCookTime(meal.strInstructions, ingredients.length);
    
    // Generate a rating between 4.0 and 5.0
    const rating = Math.round((4.0 + Math.random() * 1.0) * 10) / 10;
    
    // Get appropriate image for the recipe
    const image = this.getRecipeImage(meal.strMeal, meal.strMealThumb, meal.strCategory);
    
    return {
      id: `mealdb_${meal.idMeal}`,
      name: meal.strMeal,
      image,
      rating,
      cookTime,
      servings: 4, // Default servings
      category: meal.strCategory,
      area: meal.strArea || undefined,
      ingredients,
      steps,
      isFavorite: false,
    };
  }

  private extractIngredients(meal: MealDBMeal): Ingredient[] {
    const ingredients: Ingredient[] = [];
    
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          id: `${meal.idMeal}_ingredient_${i}`,
          name: ingredient.trim(),
          amount: measure?.trim() || '1',
          category: this.categorizeIngredient(ingredient.trim()),
        });
      }
    }
    
    return ingredients;
  }

  private extractSteps(instructions: string): string[] {
    if (!instructions) return ['No instructions available'];
    
    // Split by common step indicators
    const steps = instructions
      .split(/\d+\.|\bStep \d+|\bSTEP \d+/i)
      .map(step => step.trim())
      .filter(step => step.length > 10); // Filter out very short steps
    
    // If no numbered steps found, split by sentences
    if (steps.length <= 1) {
      return instructions
        .split(/\. (?=[A-Z])/)
        .map(step => step.trim())
        .filter(step => step.length > 10)
        .map(step => step.endsWith('.') ? step : step + '.');
    }
    
    return steps.map(step => step.endsWith('.') ? step : step + '.');
  }

  private estimateCookTime(instructions: string, ingredientCount: number): string {
    const instructionLength = instructions.length;
    const hasWords = (words: string[]) => 
      words.some(word => instructions.toLowerCase().includes(word));
    
    // Quick dishes
    if (hasWords(['quick', 'fast', 'microwave', 'no cook'])) {
      return '10 min';
    }
    
    // Long cooking processes
    if (hasWords(['slow cook', 'braise', 'roast', 'bake', 'marinate'])) {
      return `${60 + Math.floor(Math.random() * 120)} min`;
    }
    
    // Medium dishes
    if (hasWords(['simmer', 'sauté', 'fry', 'grill'])) {
      return `${20 + Math.floor(Math.random() * 40)} min`;
    }
    
    // Estimate based on complexity
    const baseTime = Math.max(15, Math.min(90, ingredientCount * 3 + instructionLength / 50));
    return `${Math.round(baseTime)} min`;
  }

  private getRecipeImage(recipeName: string, originalImage: string, category: string): string {
    console.log('[TheMealDB] Variante 1 aktiv: immer Originalbild verwenden');
    return originalImage ?? '';
  }
  
  private isImageInappropriate(recipeName: string, imageUrl: string): boolean {
    const lowerName = recipeName.toLowerCase();
    const lowerUrl = imageUrl.toLowerCase();
    
    // Check if it's a meat dish but has fruit/vegetable image indicators
    const isMeatDish = ['beef', 'chicken', 'pork', 'lamb', 'turkey', 'meat', 'taco', 'burger'].some(meat => lowerName.includes(meat));
    const hasFruitImageIndicators = ['fruit', 'apple', 'orange', 'berry', 'banana', 'citrus'].some(fruit => lowerUrl.includes(fruit));
    
    return isMeatDish && hasFruitImageIndicators;
  }

  private categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();
    
    if (['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'bacon'].some(meat => lower.includes(meat))) {
      return 'Protein';
    }
    
    if (['onion', 'garlic', 'tomato', 'carrot', 'potato', 'pepper', 'mushroom', 'spinach', 'lettuce', 'cucumber'].some(veg => lower.includes(veg))) {
      return 'Vegetables';
    }
    
    if (['apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'grape', 'mango'].some(fruit => lower.includes(fruit))) {
      return 'Fruits';
    }
    
    if (['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'].some(dairy => lower.includes(dairy))) {
      return 'Dairy';
    }
    
    if (['rice', 'pasta', 'bread', 'flour', 'oats', 'quinoa', 'noodle'].some(grain => lower.includes(grain))) {
      return 'Grains';
    }
    
    if (['salt', 'pepper', 'garlic powder', 'paprika', 'cumin', 'oregano', 'basil', 'thyme', 'rosemary'].some(spice => lower.includes(spice))) {
      return 'Spices';
    }
    
    if (['oil', 'vinegar', 'sauce', 'stock', 'broth'].some(condiment => lower.includes(condiment))) {
      return 'Condiments';
    }
    
    return 'Other';
  }
}

export const themealdb = new TheMealDBService();
export default themealdb;