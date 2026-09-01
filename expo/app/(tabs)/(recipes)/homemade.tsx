import React, { useCallback, useRef, useState } from "react";
import { FlatList, StyleSheet, View, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Plus, ChefHat, Pencil, Trash2 } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";

import RecipeCard from "@/components/RecipeCard";
import InlineConfirm from "@/components/InlineConfirm";
import { onHeaderScroll } from "@/components/CollapsingTabHeader";
import { useCustomRecipes, useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useCollapsibleHeader } from "@/hooks/use-collapsible-header";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { Recipe } from "@/types/recipe";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomemadeRecipesScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDesktop = useIsDesktop();
  const { search } = useRecipeFilters();
  const { setProgress } = useCollapsibleHeader();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const customRecipes = useCustomRecipes(search);
  const { deleteCustomRecipe } = useDailyChefMateStore();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const listRef = useRef<FlatList<Recipe>>(null);

  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => setProgress(0), [setProgress]));

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    setProgress(Math.max(0, Math.min(1, y / 220)));
    onHeaderScroll(e);
  }, [setProgress]);

  const handleAddRecipe = () => router.push("/add-recipe");
  const handleEditRecipe = (recipe: Recipe) =>
    router.push({ pathname: "/add-recipe", params: { editId: recipe.id } });

  const renderItem = ({ item }: { item: Recipe }) => {
    return (
      <View style={[styles.recipeContainer, columns > 1 && { width: itemWidth }]}>
        <RecipeCard recipe={item} />
        {confirmingDeleteId === item.id ? (
          <InlineConfirm
            style={styles.deleteConfirm}
            question={t('confirmDelete')}
            confirmLabel={t('delete')}
            destructive
            onConfirm={() => {
              deleteCustomRecipe(item.id);
              setConfirmingDeleteId(null);
            }}
            onCancel={() => setConfirmingDeleteId(null)}
            testID={`delete-confirm-${item.id}`}
          />
        ) : (
          <View style={styles.actionButtons}>
            <Button
              label={t('edit')}
              variant="secondary"
              size="sm"
              leftIcon={<Pencil size={15} color={theme.textPrimary} />}
              onPress={() => handleEditRecipe(item)}
              style={styles.actionButton}
            />
            <Button
              label={t('delete')}
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={15} color={theme.textOnAccent} />}
              onPress={() => setConfirmingDeleteId(item.id)}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>
    );
  };

  const gridMax = isDesktop
    ? { maxWidth: theme.layout.containerWide, alignSelf: "center" as const, width: "100%" as const }
    : null;

  return (
    <View style={styles.container}>
      {customRecipes.length > 0 ? (
        <FlatList
          ref={listRef}
          key={columns}
          data={customRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={[styles.listContent, gridMax]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          testID="custom-recipes-list"
        />
      ) : (
        <EmptyState
          icon={<ChefHat size={26} color={theme.textMuted} />}
          title={t('noHomemadeRecipes')}
          description={t('createFirstRecipe')}
          action={{
            label: t('addRecipe'),
            leftIcon: <Plus size={16} color={theme.textOnAccent} />,
            onPress: handleAddRecipe,
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    listContent: {
      padding: t.space[5],
      // Clear the bottom tab bar so the last card's edit/delete row is reachable.
      paddingBottom: 140,
    },
    recipeContainer: {
      marginBottom: t.space[5],
    },
    gridRow: {
      gap: t.space[5],
    },
    actionButtons: {
      flexDirection: "row",
      marginTop: t.space[3],
      gap: t.space[3],
    },
    deleteConfirm: {
      marginTop: t.space[3],
    },
    actionButton: {
      flex: 1,
    },
  });
