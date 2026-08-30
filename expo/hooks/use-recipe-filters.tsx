import createContextHook from '@nkzw/create-context-hook';
import { useState } from 'react';

// Shared browse state for the Rezepte tab (search query + cuisine/course
// selection). Lives above the tab navigator so the filter/search bar
// (rendered as part of the tab bar, outside the swipeable pager) and both
// recipe lists can share it.
export const [RecipeFiltersProvider, useRecipeFilters] = createContextHook(() => {
  const [search, setSearch] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  return {
    search,
    setSearch,
    selectedCuisine,
    setSelectedCuisine,
    selectedCourse,
    setSelectedCourse,
  };
});
