import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View, Pressable } from "react-native";
import { Plus, ChefHat, Edit, Trash2 } from "lucide-react-native";
import { router } from "expo-router";

import RecipeCard from "@/components/RecipeCard";
import SearchBar from "@/components/SearchBar";
import InlineConfirm from "@/components/InlineConfirm";
import { onHeaderScroll } from "@/components/CollapsingTabHeader";
import { useCustomRecipes, useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import Colors from "@/constants/colors";
import { Recipe } from "@/types/recipe";
import { useGridLayout } from "@/hooks/use-responsive";

export default function HomemadeRecipesScreen() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const customRecipes = useCustomRecipes(searchQuery);
  const { deleteCustomRecipe } = useDailyChefMateStore();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });

  const handleAddRecipe = () => {
    router.push("/add-recipe");
  };

  const handleEditRecipe = (recipe: Recipe) => {
    router.push({
      pathname: "/add-recipe",
      params: { editId: recipe.id }
    });
  };

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
            <Pressable
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditRecipe(item)}
            >
              <Edit size={16} color={Colors.white} />
              <Text style={styles.actionButtonText}>{t('edit')}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => setConfirmingDeleteId(item.id)}
            >
              <Trash2 size={16} color={Colors.white} />
              <Text style={styles.actionButtonText}>{t('delete')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ChefHat size={64} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>{t('noHomemadeRecipes')}</Text>
      <Text style={styles.emptySubtitle}>{t('createFirstRecipe')}</Text>
      <Pressable style={styles.addFirstRecipeButton} onPress={handleAddRecipe}>
        <Plus size={20} color={Colors.white} />
        <Text style={styles.addFirstRecipeButtonText}>{t('addRecipe')}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('search')}
        />
      </View>
      
      {customRecipes.length > 0 ? (
        <>
          <FlatList
            key={columns}
            data={customRecipes}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={onHeaderScroll}
            scrollEventThrottle={16}
            testID="custom-recipes-list"
          />
          <View style={styles.bottomButtonContainer}>
            <Pressable style={styles.addButton} onPress={handleAddRecipe}>
              <Plus size={20} color={Colors.white} />
              <Text style={styles.addButtonText}>{t('addRecipe')}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        renderEmptyState()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomButtonContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  recipeContainer: {
    marginBottom: 16,
  },
  gridRow: {
    gap: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  deleteConfirm: {
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  addFirstRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    gap: 8,
    marginTop: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addFirstRecipeButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});