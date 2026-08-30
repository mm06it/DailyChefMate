// Cuisine / course filters for the "Alle Rezepte" tab. Shared between the
// filter bar (chip rendering) and the recipe list (actual filtering).

export interface CuisineFilter {
  id: string;
  name: string;
  // Recipe categories that count as this cuisine; null = "all".
  match: string[] | null;
}

export interface CourseFilter {
  id: string;
  name: string;
}

export const CUISINE_FILTERS: CuisineFilter[] = [
  { id: 'all', name: 'Alle', match: null },
  { id: 'italian', name: 'Italienisch', match: ['Italian'] },
  { id: 'asian', name: 'Asiatisch', match: ['Asian', 'Thai', 'Chinese', 'Japanese', 'Korean'] },
  { id: 'indian', name: 'Indisch', match: ['Indian'] },
  { id: 'mexican', name: 'Mexikanisch', match: ['Mexican'] },
  { id: 'mediterranean', name: 'Mediterran', match: ['Mediterranean', 'Greek'] },
  { id: 'american', name: 'Amerikanisch', match: ['American'] },
  { id: 'british', name: 'Britisch', match: ['British'] },
  { id: 'breakfast', name: 'Frühstück', match: ['Breakfast'] },
  { id: 'vegetarian', name: 'Vegetarisch', match: ['Vegetarian'] },
  { id: 'vegan', name: 'Vegan', match: ['Vegan'] },
  { id: 'seafood', name: 'Seafood', match: ['Seafood'] },
];

export const COURSE_FILTERS: CourseFilter[] = [
  { id: 'all', name: 'Alle' },
  { id: 'starter', name: 'Vorspeise' },
  { id: 'main', name: 'Hauptspeise' },
  { id: 'dessert', name: 'Nachspeise' },
];
