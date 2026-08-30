import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { useRefrigeratorItems } from "@/hooks/use-dailychefmate-store";
import IngredientItem from "./IngredientItem";

interface CategorySectionProps {
  name: string;
  searchQuery: string;
}

export default function CategorySection({ name, searchQuery }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const ingredients = useRefrigeratorItems(searchQuery, name);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (ingredients.length === 0) return null;

  return (
    <View style={styles.container} testID={`category-section-${name}`}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <Text style={styles.title}>{name}</Text>
        <View style={styles.rightContent}>
          <Text style={styles.count}>{ingredients.length}</Text>
          {isExpanded ? (
            <ChevronUp size={20} color={Colors.textLight} />
          ) : (
            <ChevronDown size={20} color={Colors.textLight} />
          )}
        </View>
      </Pressable>
      
      {isExpanded && (
        <View style={styles.content}>
          {ingredients.map((ingredient) => (
            <IngredientItem 
              key={ingredient.id} 
              ingredient={ingredient} 
              showRemove={true}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.card,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  count: {
    fontSize: 16,
    color: Colors.textLight,
    marginRight: 8,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});