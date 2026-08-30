import { useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import CollapsingTabHeader, {
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import RecipeCard from "@/components/RecipeCard";
import { useFavoriteRecipes } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";
import { Recipe } from "@/types/recipe";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const favoriteRecipes = useFavoriteRecipes();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();

  useFocusEffect(useCallback(() => resetHeader(), []));

  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={columns > 1 ? { width: itemWidth } : undefined}>
      <RecipeCard recipe={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      {!isDesktop && <CollapsingTabHeader />}

      {favoriteRecipes.length > 0 ? (
        <FlatList
          key={columns}
          data={favoriteRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={[
            styles.listContent,
            !isDesktop && { paddingTop: topPad + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={isDesktop ? undefined : onHeaderScroll}
          scrollEventThrottle={16}
          testID="favorites-list"
        />
      ) : (
        <View style={[styles.emptyContainer, !isDesktop && { paddingTop: topPad }]}>
          <Text style={styles.emptyText}>{t('noFavorites')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContent: {
    padding: 16,
  },
  gridRow: {
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
  },
});
