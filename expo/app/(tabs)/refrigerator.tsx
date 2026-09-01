import { useFocusEffect } from "expo-router";
import { Plus, Refrigerator as FridgeIcon, X } from "lucide-react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Animated, Pressable, StyleSheet, View, FlatList, Text as RNText } from "react-native";

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
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";

import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { translateText } from "@/constants/translations";
import { Ingredient } from "@/types/recipe";
import { searchIngredientsOnline } from "@/lib/ingredient-search";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORY_ORDER = [
  "Vegetables", "Dairy", "Meat", "Fruits", "Grains", "Pasta", "Spices",
  "Condiments", "Oils", "Baking", "Legumes", "Nuts", "Frozen", "Beverages",
];

type ListRow =
  | { type: "header"; key: string; category: string }
  | { type: "row"; key: string; items: Ingredient[] };

export default function RefrigeratorScreen() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

  const toggleAddForm = () => setShowAddForm(!showAddForm);

  useEffect(() => {
    const searchOnline = async () => {
      if (searchQuery.length >= 2) {
        try {
          setOnlineResults(await searchIngredientsOnline(searchQuery));
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

  const filteredLocalIngredients = refrigeratorItems.filter((ingredient: Ingredient) => {
    const query = searchQuery.toLowerCase().trim();
    const englishName = ingredient.name.toLowerCase();
    const translatedName = translateText(language, ingredient.name).toLowerCase();
    if (englishName.includes(query) || translatedName.includes(query)) return true;
    const amount = ingredient.amount?.toLowerCase().replace(/\s+/g, '');
    return !!amount && amount.includes(query.replace(/\s+/g, ''));
  });

  const allIngredients = useMemo(() => {
    if (searchQuery.length < 2) return filteredLocalIngredients;
    const localNames = new Set(refrigeratorItems.map(item => item.name.toLowerCase()));
    const uniqueOnlineResults = onlineResults.filter(item => !localNames.has(item.name.toLowerCase()));
    return [...filteredLocalIngredients, ...uniqueOnlineResults];
  }, [filteredLocalIngredients, onlineResults, searchQuery, refrigeratorItems]);

  const handleImmediateAdd = (ingredient: Ingredient) => {
    addIngredient({
      ...ingredient,
      amount: '',
      isSelected: true,
      isOnlineResult: false,
      id: `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  };

  const handleOpenQuantityModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (ingredient: Ingredient, amount: string) => {
    if (ingredient.isOnlineResult) {
      addIngredient({
        ...ingredient,
        amount,
        isSelected: true,
        isOnlineResult: false,
        id: `ingredient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    } else {
      updateIngredientAmount(ingredient.id, amount);
    }
  };

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
        <RNText style={[styles.sectionHeader, index === 0 && styles.sectionHeaderFirst]}>
          {translateText(language, item.category)}
        </RNText>
      );
    }
    return (
      <View style={styles.gridRow}>
        {item.items.map((ingredient) => (
          <View key={ingredient.id} style={[styles.ingredientContainer, columns > 1 && { width: itemWidth }]}>
            <IngredientItem
              ingredient={ingredient}
              onSelect={ingredient.isOnlineResult ? () => handleImmediateAdd(ingredient) : undefined}
              onEditQuantity={() => handleOpenQuantityModal(ingredient)}
            />
            {ingredient.isOnlineResult && (
              <View style={styles.onlineIndicator}>
                <RNText style={styles.onlineText}>{t('online')}</RNText>
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
        <Pressable onPress={toggleAddForm} style={styles.addButton} accessibilityLabel={t('addIngredient')}>
          <Plus size={22} color={theme.textOnAccent} />
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
          <X size={22} color={hasSelection ? theme.textPrimary : theme.textMuted} />
        </Pressable>
      </View>
    </>
  );

  const list =
    listRows.length === 0 ? (
      <EmptyState
        icon={<FridgeIcon size={24} color={theme.textMuted} />}
        title={searchQuery ? t('noRecipesFound') : t('refrigeratorEmpty')}
        description={searchQuery ? undefined : t('refrigeratorEmptyHint')}
        action={
          searchQuery
            ? undefined
            : { label: t('addIngredient'), onPress: () => setShowAddForm(true) }
        }
      />
    ) : (
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

      <AddIngredientForm isVisible={showAddForm} onClose={() => setShowAddForm(false)} />

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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    body: { flex: 1 },
    list: { flex: 1 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.space[5],
      paddingVertical: t.space[4],
      backgroundColor: t.bg,
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    addButton: {
      backgroundColor: t.accent,
      borderRadius: t.radius.md,
      width: 44,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: t.space[3],
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: t.space[3],
      marginHorizontal: t.space[5],
      marginVertical: t.space[5],
    },
    generateButton: { flex: 3, marginHorizontal: 0, marginVertical: 0 },
    clearButton: {
      flex: 1,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButtonDisabled: { opacity: 0.6 },
    listContent: { padding: t.space[5] },
    gridRow: { flexDirection: 'row', gap: t.space[3] },
    sectionHeader: {
      fontFamily: t.font.bodyBold,
      fontSize: 12,
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: t.space[6],
      marginBottom: t.space[1],
      marginLeft: 2,
    },
    sectionHeaderFirst: { marginTop: 0 },
    ingredientContainer: { marginVertical: t.space[2], position: 'relative' },
    onlineIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: t.accent,
      borderRadius: t.radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      zIndex: 1,
    },
    onlineText: { color: t.textOnAccent, fontFamily: t.font.bodySemibold, fontSize: 10 },
  });
