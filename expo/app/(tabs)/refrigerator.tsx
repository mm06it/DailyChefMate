import { Stack } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useState, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View, FlatList, Text } from "react-native";

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
import { useGridLayout } from "@/hooks/use-responsive";

export default function RefrigeratorScreen() {
  const { t, language } = useLanguage();
  const { columns, itemWidth } = useGridLayout(110, { horizontalPadding: 32, gap: 8, maxColumns: 10 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Ingredient[]>([]);
  const { refrigeratorItems, updateIngredientAmount, addIngredient } = useDailyChefMateStore();

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
    const query = searchQuery.toLowerCase();
    const englishName = ingredient.name.toLowerCase();
    const translatedName = translateText(language, ingredient.name).toLowerCase();
    
    // Search in both English and translated names
    return englishName.includes(query) || translatedName.includes(query);
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

  const renderIngredient = ({ item }: { item: Ingredient }) => {
    return (
      <View style={[styles.ingredientContainer, columns > 1 && { width: itemWidth }]}>
        <IngredientItem
          ingredient={item}
          onSelect={item.isOnlineResult ? () => handleImmediateAdd(item) : undefined}
          onEditQuantity={() => handleOpenQuantityModal(item)}
        />
        {item.isOnlineResult && (
          <View style={styles.onlineIndicator}>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <View style={styles.header}>
        <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('search')}
        />
        <Pressable onPress={toggleAddForm} style={styles.addButton}>
          <Plus size={24} color={Colors.background} />
        </Pressable>
      </View>
      
      <GenerateRecipesButton />
      
      <FlatList
        key={columns}
        data={allIngredients}
        renderItem={renderIngredient}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
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
  header: {
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
  listContent: {
    padding: 16,
  },
  gridRow: {
    gap: 8,
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