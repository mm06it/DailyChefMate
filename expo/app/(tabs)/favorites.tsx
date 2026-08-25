import { Stack } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import RecipeCard from "@/components/RecipeCard";
import { useFavoriteRecipes } from "@/hooks/use-fridgy-store";
import { useLanguage } from "@/hooks/use-language";
import { useGridColumns } from "@/hooks/use-responsive";
import { Recipe } from "@/types/recipe";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const favoriteRecipes = useFavoriteRecipes();
  const columns = useGridColumns(280, { maxColumns: 4 });

  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={columns > 1 ? styles.gridItem : undefined}>
      <RecipeCard recipe={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Favorites",
          headerTitleStyle: styles.headerTitle,
        }}
      />

      {favoriteRecipes.length > 0 ? (
        <FlatList
          key={columns}
          data={favoriteRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="favorites-list"
        />
      ) : (
        <View style={styles.emptyContainer}>
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
  headerTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  gridRow: {
    gap: 16,
  },
  gridItem: {
    flex: 1,
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