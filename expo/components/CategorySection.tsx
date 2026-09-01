import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useRefrigeratorItems } from "@/hooks/use-dailychefmate-store";
import { Text } from "@/components/ui/Text";
import IngredientItem from "./IngredientItem";

interface CategorySectionProps {
  name: string;
  searchQuery: string;
}

export default function CategorySection({ name, searchQuery }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ingredients = useRefrigeratorItems(searchQuery, name);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  if (ingredients.length === 0) return null;

  return (
    <View style={styles.container} testID={`category-section-${name}`}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <Text variant="h3">{name}</Text>
        <View style={styles.rightContent}>
          <Text variant="bodySm" color="secondary" style={styles.count}>
            {ingredients.length}
          </Text>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.textSecondary} />
          ) : (
            <ChevronDown size={20} color={theme.textSecondary} />
          )}
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {ingredients.map((ingredient) => (
            <IngredientItem key={ingredient.id} ingredient={ingredient} showRemove={true} />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      marginBottom: t.space[3],
      backgroundColor: t.surface,
      borderRadius: t.radius.md,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: t.space[5],
    },
    rightContent: { flexDirection: "row", alignItems: "center" },
    count: { marginRight: t.space[3] },
    content: {
      borderTopWidth: t.borderWidth.hairline,
      borderTopColor: t.border,
    },
  });
