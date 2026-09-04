import { ConfirmDialog } from "@/components/ConfirmDialog";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { translateText } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { Text } from "@/components/ui/Text";
import { Ingredient } from "@/types/recipe";

interface IngredientItemProps {
  ingredient: Ingredient;
  showRemove?: boolean;
  onSelect?: () => void;
  onEditQuantity?: () => void;
}

export default function IngredientItem({ ingredient, showRemove = false, onSelect, onEditQuantity }: IngredientItemProps) {
  const { toggleIngredientSelection, selectIngredient } = useDailyChefMateStore();
  const { currentLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [confirmVisible, setConfirmVisible] = React.useState<boolean>(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{ title: string; message: string; onConfirm: () => void; confirmLabel?: string } | null>(null);

  const handleToggle = () => {
    if (ingredient.isSelected) {
      // Only confirm when there's an amount to lose; a bare selection just toggles off.
      const hasAmount = !!ingredient.amount && ingredient.amount.trim().length > 0;
      if (!hasAmount) {
        toggleIngredientSelection(ingredient.id);
        return;
      }
      setConfirmConfig({
        title: t('unselectIngredient') || 'Auswahl aufheben',
        message: translateText(currentLanguage, ingredient.name) || ingredient.name,
        confirmLabel: t('unselect') || 'Auswahl aufheben',
        onConfirm: () => toggleIngredientSelection(ingredient.id),
      });
      setConfirmVisible(true);
      return;
    }
    if (onSelect) onSelect();
    else selectIngredient(ingredient.id);
  };

  const handleEditQuantity = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onEditQuantity?.();
  };

  const accent = theme.accent;

  return (
    <>
      <Pressable
        style={[styles.container, ingredient.isSelected && styles.containerSelected]}
        onPress={handleToggle}
        testID={`ingredient-item-${ingredient.id}`}
      >
        <View style={styles.content}>
          <View style={[styles.checkbox, ingredient.isSelected && { borderColor: accent }]}>
            {ingredient.isSelected && <View style={[styles.checkboxInner, { backgroundColor: accent }]} />}
          </View>
          <Text variant="label" center numberOfLines={2} style={styles.name}>
            {translateText(currentLanguage, ingredient.name) || ingredient.name || 'Unknown'}
          </Text>
          {ingredient.isSelected && (
            <Pressable
              style={[styles.amountBadge, ingredient.amount ? { borderColor: accent } : undefined]}
              onPress={handleEditQuantity}
              hitSlop={6}
              testID={`ingredient-item-${ingredient.id}-amount`}
            >
              <Text
                variant="caption"
                weight="semibold"
                numberOfLines={1}
                style={{ color: ingredient.amount ? accent : theme.textSecondary }}
              >
                {ingredient.amount ? ingredient.amount : (t('setAmount') || '+ Menge')}
              </Text>
            </Pressable>
          )}
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.surface,
      borderRadius: t.radius.md,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      padding: t.space[3],
      minHeight: 96,
    },
    containerSelected: {
      backgroundColor: t.accentSubtle,
      borderColor: t.accent,
    },
    content: { flex: 1, alignItems: "center" },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: t.borderStrong,
      marginBottom: t.space[3],
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxInner: { width: 10, height: 10, borderRadius: 5 },
    name: { marginBottom: t.space[2] },
    amountBadge: {
      marginTop: 2,
      paddingHorizontal: t.space[3],
      paddingVertical: 3,
      borderRadius: t.radius.pill,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      backgroundColor: t.surfaceSunken,
    },
  });
