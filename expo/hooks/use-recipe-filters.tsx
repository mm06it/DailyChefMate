import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';

// Cuisine / course selection for the "Alle Rezepte" tab. Lives above the
// tab navigator so the filter bar (rendered as part of the tab bar, outside
// the swipeable pager) and the recipe list can share it.
export const [RecipeFiltersProvider, useRecipeFilters] = createContextHook(() => {
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  return { selectedCuisine, setSelectedCuisine, selectedCourse, setSelectedCourse };
});
