import { router } from 'expo-router';
import { ChevronDown, Globe, Plus, Search, UtensilsCrossed, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors from '@/constants/colors';
import { translateText } from '@/constants/translations';
import { CUISINE_FILTERS, COURSE_FILTERS } from '@/constants/recipe-filters';
import { useCollapsibleHeader } from '@/hooks/use-collapsible-header';
import { useLanguage } from '@/hooks/use-language';
import { useRecipeFilters } from '@/hooks/use-recipe-filters';

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

type Option = { id: string; name: string };

function FilterMenu({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { currentLanguage } = useLanguage();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose}>
        <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.menuTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const active = opt.id === selected;
              return (
                <Pressable
                  key={opt.id}
                  style={[styles.menuOption, active && styles.menuOptionActive]}
                  onPress={() => onSelect(opt.id)}
                  testID={`filter-option-${opt.id}`}
                >
                  <Text style={[styles.menuOptionText, active && styles.menuOptionTextActive]}>
                    {translateText(currentLanguage, opt.name)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// One row for the Rezepte tab: search icon + "Küche" / "Kurs-Art" dropdowns.
// Rendered as part of the tab bar (OUTSIDE the swipeable pager) and collapses
// away as the list scrolls. The chips only show on "Alle Rezepte".
export default function RecipeFilterBar({
  showFilters,
  showAddRecipe = false,
}: {
  showFilters: boolean;
  showAddRecipe?: boolean;
}) {
  const { progress } = useCollapsibleHeader();
  const { t: translate, currentLanguage } = useLanguage();
  const {
    search,
    setSearch,
    selectedCuisine,
    setSelectedCuisine,
    selectedCourse,
    setSelectedCourse,
  } = useRecipeFilters();
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState<null | 'cuisine' | 'course'>(null);

  const t = clamp(progress);
  const collapsed = t > 0.98;

  const cuisineName = CUISINE_FILTERS.find((c) => c.id === selectedCuisine)?.name;
  const cuisineLabel =
    selectedCuisine === 'all' || !cuisineName
      ? translate('cuisine')
      : translateText(currentLanguage, cuisineName);
  const courseName = COURSE_FILTERS.find((c) => c.id === selectedCourse)?.name;
  const courseLabel =
    selectedCourse === 'all' || !courseName
      ? translate('courseType')
      : translateText(currentLanguage, courseName);

  // "Alle Rezepte": icon that expands into the field. Other tab: field always.
  const fieldMode = searchOpen || !showFilters;

  return (
    <>
      <View
        style={[
          styles.clip,
          contentHeight != null && { height: contentHeight * (1 - t), opacity: 1 - t },
        ]}
        pointerEvents={collapsed ? 'none' : 'auto'}
      >
        <View
          style={styles.row}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          {fieldMode ? (
            <>
              <Search size={22} color={Colors.textLight} style={styles.searchIcon} strokeWidth={2.5} />
              <TextInput
                style={styles.inputSearch}
                value={search}
                onChangeText={setSearch}
                placeholder={translate('search')}
                placeholderTextColor={Colors.textLight}
                autoFocus={searchOpen}
                returnKeyType="search"
              />
              {(showFilters || !!search) && (
                <Pressable
                  onPress={() => {
                    setSearch('');
                    setSearchOpen(false);
                  }}
                  hitSlop={10}
                  testID="filter-search-close"
                >
                  <X size={18} color={Colors.textLight} />
                </Pressable>
              )}
              {showFilters && (
                <View style={styles.miniGroup}>
                  <Pressable
                    style={[styles.pillMini, selectedCuisine !== 'all' && styles.pillActive]}
                    onPress={() => setMenu('cuisine')}
                    testID="filter-cuisine-button"
                    accessibilityLabel={translate('cuisine')}
                  >
                    <Globe size={16} color={selectedCuisine !== 'all' ? Colors.white : Colors.textLight} />
                  </Pressable>
                  <Pressable
                    style={[styles.pillMini, selectedCourse !== 'all' && styles.pillActive]}
                    onPress={() => setMenu('course')}
                    testID="filter-course-button"
                    accessibilityLabel={translate('courseType')}
                  >
                    <UtensilsCrossed size={16} color={selectedCourse !== 'all' ? Colors.white : Colors.textLight} />
                  </Pressable>
                </View>
              )}
              {showAddRecipe && (
                <Pressable
                  style={styles.addRecipeBtn}
                  onPress={() => router.push('/add-recipe')}
                  hitSlop={8}
                  testID="filter-add-recipe"
                  accessibilityRole="button"
                  accessibilityLabel={translate('addRecipe')}
                >
                  <Plus size={22} color={Colors.white} strokeWidth={2.6} />
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Pressable
                style={styles.searchIconBtn}
                onPress={() => setSearchOpen(true)}
                hitSlop={8}
                testID="filter-search-open"
                accessibilityRole="button"
                accessibilityLabel={translate('search')}
              >
                <Search size={24} color={Colors.text} strokeWidth={2.5} />
              </Pressable>
              <Pressable
                style={[styles.pill, selectedCuisine !== 'all' && styles.pillActive]}
                onPress={() => setMenu('cuisine')}
                testID="filter-cuisine-button"
              >
                <Text
                  style={[styles.pillText, selectedCuisine !== 'all' && styles.pillTextActive]}
                  numberOfLines={1}
                >
                  {cuisineLabel}
                </Text>
                <ChevronDown
                  size={15}
                  color={selectedCuisine !== 'all' ? Colors.white : Colors.textLight}
                />
              </Pressable>
              <Pressable
                style={[styles.pill, selectedCourse !== 'all' && styles.pillActive]}
                onPress={() => setMenu('course')}
                testID="filter-course-button"
              >
                <Text
                  style={[styles.pillText, selectedCourse !== 'all' && styles.pillTextActive]}
                  numberOfLines={1}
                >
                  {courseLabel}
                </Text>
                <ChevronDown
                  size={15}
                  color={selectedCourse !== 'all' ? Colors.white : Colors.textLight}
                />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <FilterMenu
        visible={menu === 'cuisine'}
        title={translate('cuisine')}
        options={CUISINE_FILTERS}
        selected={selectedCuisine}
        onSelect={(id) => {
          setSelectedCuisine(id);
          setMenu(null);
        }}
        onClose={() => setMenu(null)}
      />
      <FilterMenu
        visible={menu === 'course'}
        title={translate('courseType')}
        options={COURSE_FILTERS}
        selected={selectedCourse}
        onSelect={(id) => {
          setSelectedCourse(id);
          setMenu(null);
        }}
        onClose={() => setMenu(null)}
      />
    </>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchIconBtn: {
    width: 44,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRecipeBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inputSearch: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 60,
    maxWidth: 170,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 6,
  },
  miniGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pillMini: {
    width: 38,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  pillTextActive: {
    color: Colors.white,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  menuOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuOptionActive: {
    backgroundColor: Colors.primary,
  },
  menuOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  menuOptionTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
});
