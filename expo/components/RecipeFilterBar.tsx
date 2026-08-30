import { Filter } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import {
  CUISINE_FILTERS,
  COURSE_FILTERS,
  type CuisineFilter,
  type CourseFilter,
} from '@/constants/recipe-filters';
import { useCollapsibleHeader } from '@/hooks/use-collapsible-header';
import { useRecipeFilters } from '@/hooks/use-recipe-filters';

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

// Cuisine / course chips for the "Alle Rezepte" tab. Rendered as part of the
// tab bar (i.e. OUTSIDE react-native-tab-view's swipeable pager) so a
// horizontal swipe scrolls the chips instead of flipping to the next tab.
// Collapses away as the list is scrolled, mirroring the header.
export default function RecipeFilterBar({ visible }: { visible: boolean }) {
  const { progress } = useCollapsibleHeader();
  const { selectedCuisine, setSelectedCuisine, selectedCourse, setSelectedCourse } =
    useRecipeFilters();
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  if (!visible) return null;

  const t = clamp(progress);
  const collapsed = t > 0.98;

  const renderCuisine = ({ item }: { item: CuisineFilter }) => {
    const active = selectedCuisine === item.id;
    return (
      <Pressable
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => setSelectedCuisine(item.id)}
        testID={`filter-cuisine-${item.id}`}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
      </Pressable>
    );
  };

  const renderCourse = ({ item }: { item: CourseFilter }) => {
    const active = selectedCourse === item.id;
    return (
      <Pressable
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => setSelectedCourse(item.id)}
        testID={`filter-course-${item.id}`}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.clip,
        contentHeight != null && { height: contentHeight * (1 - t), opacity: 1 - t },
      ]}
      pointerEvents={collapsed ? 'none' : 'auto'}
    >
      <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <Filter size={16} color={Colors.textLight} />
            <Text style={styles.rowTitle}>Küche</Text>
          </View>
          <FlatList
            data={CUISINE_FILTERS}
            renderItem={renderCuisine}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <Filter size={16} color={Colors.textLight} />
            <Text style={styles.rowTitle}>Kurs-Art</Text>
          </View>
          <FlatList
            data={COURSE_FILTERS}
            renderItem={renderCourse}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  list: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
