import { Stack } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import RecipeCard from "@/components/RecipeCard";
import { useFavoriteRecipes } from "@/hooks/use-fridgy-store";
import { useLanguage } from "@/hooks/use-language";
import { Recipe } from "@/types/recipe";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const favoriteRecipes = useFavoriteRecipes();

  const renderItem = ({ item }: { item: Recipe }) => <RecipeCard recipe={item} />;

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
          data={favoriteRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
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