import { useFocusEffect } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Animated, Pressable, StyleSheet, View, FlatList, Text } from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import AddIngredientForm from "@/components/AddIngredientForm";
import IngredientItem from "@/components/IngredientItem";
import IngredientQuantityModal from "@/components/IngredientQuantityModal";
import GenerateRecipesButton from "@/components/GenerateRecipesButton";
import SearchBar from "@/components/SearchBar";
import Colors from "@/constants/colors";

import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { translateText } from "@/constants/translations";
import { Ingredient } from "@/types/recipe";
import { searchIngredientsOnline } from "@/lib/ingredient-search";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";

// Section order, roughly by how often a home cook reaches for the category.
// Anything unlisted (e.g. online-only categories like "Seafood") is appended
// after these, in first-seen order.
const CATEGORY_ORDER = [
  "Vegetables",
  "Dairy",
  "Meat",
  "Fruits",
  "Grains",
  "Pasta",
  "Spices",
  "Condiments",
  "Oils",
  "Baking",
  "Legumes",
  "Nuts",
  "Frozen",
  "Beverages",
];

type ListRow =
  | { type: "header"; key: string; category: string }
  | { type: "row"; key: string; items: Ingredient[] };

export default function RefrigeratorScreen() {
  const { t, language } = useLanguage();
  const { columns, itemWidth } = useGridLayout(110, { horizontalPadding: 32, gap: 8, maxColumns: 10 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Ingredient[]>([]);
  const { refrigeratorItems, updateIngredientAmount, addIngredient, clearSelectedIngredients } =
    useDailyChefMateStore();
  const hasSelection = refrigeratorItems.some((i) => i.isSelected);
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  useFocusEffect(useCallback(() => resetHeader(), []));

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  // Search online when query changes
  useEffect(() => {
    const searchOnline = async () => {
      if (searchQuery.length >= 2) {
        try {
          const results = await searchIngredientsOnline(searchQuery);
          setOnlineResults(results);
        } catch (error) {
          console.error('Error searching online:', error);
          setOnlineResults([]);
        }
      } else {
        setOnlineResults([]);
      }
    };

    const timeoutId = setTimeout(searchOnline, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Filter local ingredients
  const filteredLocalIngredients = refrigeratorItems.filter((ingredient: Ingredient) => {
    const query = searchQuery.toLowerCase().trim();
    const englishName = ingredient.name.toLowerCase();
    const translatedName = translateText(language, ingredient.name).toLowerCase();

    // Match on English name, translated name, or the amount ("500g" finds
    // every item stored with that quantity — "500 g" works too).
    if (englishName.includes(query) || translatedName.includes(query)) return true;
    const amount = ingredient.amount?.toLowerCase().replace(/\s+/g, '');
    return !!amount && amount.includes(query.replace(/\s+/g, ''));
  });

  // Combine local and online results
  const allIngredients = useMemo(() => {
    if (searchQuery.length < 2) {
      return filteredLocalIngredients;
    }
    
    // Filter out online results that already exist locally
    const localNames = new Set(refrigeratorItems.map(item => item.name.toLowerCase()));
    const uniqueOnlineResults = onlineResults.filter(item => 
      !localNames.has(item.name.toLowerCase())
    );
    
    return [...filteredLocalIngredients, ...uniqueOnlineResults];
  }, [filteredLocalIngredients, onlineResults, searchQuery, refrigeratorItems]);

  // Selecting an ingredient adds/marks it immediately, with no amount set —
  // the quantity is optional and only asked for if the user explicitly taps
  // the amount pill on an already-selected item.
  const handleImmediateAdd = (ingredient: Ingredient) => {
    const newIngredient: Ingredient = {
      ...ingredient,
      amount: '',
      isSelected: true,
      isOnlineResult: false,
      id: `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    addIngredient(newIngredient);
  };

  const handleOpenQuantityModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (ingredient: Ingredient, amount: string) => {
    if (ingredient.isOnlineResult) {
      // Add new ingredient from online search to the refrigerator
      const newIngredient: Ingredient = {
        ...ingredient,
        amount,
        isSelected: true,
        isOnlineResult: false,
        id: `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      addIngredient(newIngredient);
    } else {
      // Update existing ingredient amount
      updateIngredientAmount(ingredient.id, amount);
    }
  };

  // Group the flat ingredient list into category sections, each split into
  // rows of `columns`, with a header row before every section.
  const listRows = useMemo<ListRow[]>(() => {
    const groups = new Map<string, Ingredient[]>();
    for (const item of allIngredients) {
      const cat = item.category || "Other";
      const bucket = groups.get(cat);
      if (bucket) bucket.push(item);
      else groups.set(cat, [item]);
    }

    const orderedCats = Array.from(groups.keys()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const rows: ListRow[] = [];
    for (const cat of orderedCats) {
      const items = groups.get(cat)!;
      rows.push({ type: "header", key: `header-${cat}`, category: cat });
      for (let i = 0; i < items.length; i += columns) {
        rows.push({ type: "row", key: `row-${cat}-${i}`, items: items.slice(i, i + columns) });
      }
    }
    return rows;
  }, [allIngredients, columns]);

  const renderRow = ({ item, index }: { item: ListRow; index: number }) => {
    if (item.type === "header") {
      return (
        <Text style={[styles.sectionHeader, index === 0 && styles.sectionHeaderFirst]}>
          {translateText(language, item.category)}
        </Text>
      );
    }
    return (
      <View style={styles.gridRow}>
        {item.items.map((ingredient) => (
          <View
            key={ingredient.id}
            style={[styles.ingredientContainer, columns > 1 && { width: itemWidth }]}
          >
            <IngredientItem
              ingredient={ingredient}
              onSelect={ingredient.isOnlineResult ? () => handleImmediateAdd(ingredient) : undefined}
              onEditQuantity={() => handleOpenQuantityModal(ingredient)}
            />
            {ingredient.isOnlineResult && (
              <View style={styles.onlineIndicator}>
                <Text style={styles.onlineText}>{t('online')}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const toolbars = (
    <>
      <View style={styles.toolbar}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('searchMoreIngredients')}
        />
        <Pressable onPress={toggleAddForm} style={styles.addButton}>
          <Plus size={24} color={Colors.background} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <GenerateRecipesButton style={styles.generateButton} />
        <Pressable
          style={[styles.clearButton, !hasSelection && styles.clearButtonDisabled]}
          onPress={clearSelectedIngredients}
          disabled={!hasSelection}
          testID="clear-selection-button"
          accessibilityLabel={t('clearSelection') || 'Auswahl aufheben'}
        >
          <X size={22} color={Colors.background} />
        </Pressable>
      </View>
    </>
  );

  const list = (
    <FlatList
      key={columns}
      data={listRows}
      renderItem={renderRow}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
    />
  );

  return (
    <View style={styles.container}>
      {!isDesktop && <CollapsingTabHeader />}

      {isDesktop ? (
        <>
          {toolbars}
          {list}
        </>
      ) : (
        // The header hides on scroll; the toolbars ride up with it so the
        // search / generate / clear controls stay pinned to the top.
        <Animated.View
          style={[
            styles.body,
            { paddingTop: topPad, marginBottom: -topPad, transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          {toolbars}
          {list}
        </Animated.View>
      )}

      <AddIngredientForm 
        isVisible={showAddForm} 
        onClose={() => setShowAddForm(false)} 
      />
      
      <IngredientQuantityModal
        ingredient={selectedIngredient}
        isVisible={showQuantityModal}
        onClose={() => {
          setShowQuantityModal(false);
          setSelectedIngredient(null);
        }}
        onConfirm={handleQuantityConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 12,
    marginLeft: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  generateButton: {
    flex: 3,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  clearButton: {
    flex: 1,
    backgroundColor: Colors.textLight,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonDisabled: {
    opacity: 0.45,
  },
  listContent: {
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 4,
    marginLeft: 2,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  ingredientContainer: {
    marginVertical: 6,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  onlineText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
});