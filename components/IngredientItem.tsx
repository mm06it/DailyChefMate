import { ConfirmDialog } from "@/components/ConfirmDialog";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { translateText } from "@/constants/translations";
import { useFridgyStore } from "@/hooks/use-fridgy-store";
import { useLanguage } from "@/hooks/use-language";
import { Ingredient } from "@/types/recipe";

interface IngredientItemProps {
  ingredient: Ingredient;
  showRemove?: boolean;
  onToggle?: () => void;
}

export default function IngredientItem({ ingredient, showRemove = false, onToggle }: IngredientItemProps) {
  const { toggleIngredientSelection } = useFridgyStore();
  const { currentLanguage, t } = useLanguage();
  const [confirmVisible, setConfirmVisible] = React.useState<boolean>(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{ title: string; message: string; onConfirm: () => void; confirmLabel?: string } | null>(null);

  const handleToggle = () => {
    console.log('IngredientItem press', { id: ingredient.id, isSelected: ingredient.isSelected });

    if (ingredient.isSelected) {
      const title = t('unselectIngredient') || 'Auswahl aufheben';
      const message = translateText(currentLanguage, ingredient.name) || ingredient.name;

      setConfirmConfig({
        title,
        message,
        confirmLabel: t('unselect') || 'Auswahl aufheben',
        onConfirm: () => toggleIngredientSelection(ingredient.id),
      });
      setConfirmVisible(true);
      return;
    }

    if (onToggle) {
      onToggle();
    } else {
      toggleIngredientSelection(ingredient.id);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Dairy': Colors.blue,
      'Meat': Colors.primary,
      'Vegetables': Colors.green,
      'Fruits': Colors.orange,
      'Grains': Colors.secondary,
      'Pasta': Colors.secondary,
      'Spices': Colors.purple,
      'Oils': Colors.rating,
      'Condiments': Colors.accent,
      'Frozen': Colors.blue,
      'Beverages': Colors.accent,
      'Baking': Colors.rating,
      'Nuts': Colors.secondary,
    };
    return colors[category as keyof typeof colors] || Colors.textLight;
  };


  const categoryColor = getCategoryColor(ingredient.category);

  return (
    <>
      <Pressable 
        style={[
          styles.container, 
          ingredient.isSelected && styles.containerSelected,
          { borderLeftColor: categoryColor }
        ]} 
        onPress={handleToggle}
        testID={`ingredient-item-${ingredient.id}`}
      >
        <View style={styles.content}>
          <View style={[styles.checkbox, { borderColor: categoryColor }]}>
            {ingredient.isSelected && <View style={[styles.checkboxInner, { backgroundColor: categoryColor }]} />}
          </View>
          <Text style={styles.name} numberOfLines={2}>{translateText(currentLanguage, ingredient.name) || ingredient.name || 'Unknown'}</Text>
        </View>
      </Pressable>
      {confirmConfig && (
        <ConfirmDialog
          visible={confirmVisible}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          cancelLabel={t('cancel') || 'Abbrechen'}
          onCancel={() => setConfirmVisible(false)}
          onConfirm={() => {
            setConfirmVisible(false);
            confirmConfig.onConfirm();
          }}
          testID={`ingredient-confirm-${ingredient.id}`}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 100,
  },
  containerSelected: {
    backgroundColor: Colors.cardSecondary,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  amount: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

});