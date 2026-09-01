import { X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { translateText } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { Ingredient } from "@/types/recipe";

type Unit = 'g' | 'ml' | 'Stück';

interface IngredientQuantityModalProps {
  ingredient: Ingredient | null;
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (ingredient: Ingredient, amount: string) => void;
}

export default function IngredientQuantityModal({ 
  ingredient, 
  isVisible, 
  onClose, 
  onConfirm 
}: IngredientQuantityModalProps) {
  const [selectedUnit, setSelectedUnit] = useState<Unit>('g');
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  const { currentLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const defaultUnitFromIngredient = (ing: Ingredient | null): Unit => {
    const name = (ing?.name ?? '').toLowerCase().trim();
    const category = (ing?.category ?? '').toLowerCase().trim();
    if (!name) return 'g';

    const liquidKeywords = [
      'milk','milch','juice','saft','oil','öl','vinegar','essig','sauce','sirup','syrup','broth','brühe','stock','cream','rahm','sahne','buttermilk','buttermilch','coconut milk','kokosmilch','soy sauce','sojasauce','lemon juice','zitronensaft','mayonnaise','ketchup','mustard','senf','extract','extrakt'
    ];

    const countableKeywords = [
      'egg','ei','eggs','eier','piece','stück','can','dose','jar','glas','bottle','flasche','loaf','laib','steak','steaks','fillet','fillets','filet','filets','leg','legs','keule','keulen','wing','wings','drumstick','drumsticks','head','kopf','bulb','ear','ears','kolben','bunch','bund','slice','slices','scheibe','scheiben','patty','patties','sausage','sausages','wurst','würste'
    ];

    if (category === 'beverages' || category === 'oils' || category === 'condiments') return 'ml';
    if (liquidKeywords.some(k => name.includes(k))) return 'ml';
    if (countableKeywords.some(k => name.includes(k))) return 'Stück';
    return 'g';
  };

  const parseExistingAmount = (amount: string | undefined): { unit: Unit; amount: number } | null => {
    if (!amount) return null;
    const match = amount.trim().match(/^(\d+(?:\.\d+)?)\s*(g|ml|Stück)$/i);
    if (!match) return null;
    const parsedAmount = Number(match[1]);
    const parsedUnit = (['g', 'ml', 'Stück'] as const).find(u => u.toLowerCase() === match[2].toLowerCase());
    if (!parsedUnit || !Number.isFinite(parsedAmount)) return null;
    return { unit: parsedUnit, amount: parsedAmount };
  };

  useEffect(() => {
    if (ingredient) {
      const existing = parseExistingAmount(ingredient.amount);
      if (existing) {
        setSelectedUnit(existing.unit);
        setSelectedAmount(existing.amount);
        return;
      }
      setSelectedUnit(defaultUnitFromIngredient(ingredient));
      setSelectedAmount(1);
    }
  }, [ingredient, isVisible]);

  const amountOptions = useMemo(() => {
    switch (selectedUnit) {
      case 'g':
        return Array.from({ length: 40 }, (_, i) => (i + 1) * 50);
      case 'ml':
        return Array.from({ length: 40 }, (_, i) => (i + 1) * 50);
      case 'Stück':
        return Array.from({ length: 20 }, (_, i) => i + 1);
      default:
        return [1];
    }
  }, [selectedUnit]);

  const units = useMemo(() => ['g', 'ml', 'Stück'] as const, []);

  const handleConfirm = () => {
    if (ingredient) {
      onConfirm(ingredient, `${selectedAmount} ${selectedUnit}`);
      setSelectedAmount(1);
      setSelectedUnit('g');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedAmount(1);
    setSelectedUnit('g');
    onClose();
  };

  if (!ingredient) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text variant="h3">{t('addQuantity')}</Text>
            <Pressable onPress={handleClose} hitSlop={10} testID="quantity-close">
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text variant="title" center style={styles.ingredientName}>
              {translateText(currentLanguage, ingredient.name) || ingredient.name}
            </Text>

            <View style={styles.selectorContainer}>
              <Text variant="label" color="secondary" style={styles.label}>{t('unitLabel')}</Text>
              <View style={styles.unitSelector}>
                {units.map((unit) => {
                  const sel = selectedUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      style={[styles.unitButton, sel && styles.unitButtonSelected]}
                      onPress={() => {
                        setSelectedUnit(unit);
                        setSelectedAmount(1);
                      }}
                      testID={`unit-${unit}`}
                    >
                      <Text variant="body" style={{ color: sel ? theme.textOnAccent : theme.textPrimary }}>
                        {translateText(currentLanguage, unit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text variant="label" color="secondary" style={styles.label}>{t('amountLabel')}</Text>
              <ScrollView style={styles.amountScrollView} showsVerticalScrollIndicator={false}>
                {amountOptions.map((amount) => {
                  const sel = selectedAmount === amount;
                  return (
                    <Pressable
                      key={amount}
                      style={[styles.amountButton, sel && styles.amountButtonSelected]}
                      onPress={() => setSelectedAmount(amount)}
                      testID={`amount-${amount}`}
                    >
                      <Text
                        variant="body"
                        weight={sel ? "semibold" : "regular"}
                        style={{ color: sel ? theme.textOnAccent : theme.textPrimary }}
                      >
                        {amount}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <Button label={t('cancel')} variant="secondary" onPress={handleClose} testID="quantity-cancel" style={styles.flex} />
              <Button label={t('addBtn')} onPress={handleConfirm} testID="quantity-confirm" style={styles.flex} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.overlay,
      paddingHorizontal: t.space[6],
    },
    modalContent: {
      backgroundColor: t.surfaceRaised,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      width: "100%",
      maxWidth: 400,
      ...t.elevation.lg,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: t.space[6],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    content: { padding: t.space[6] },
    ingredientName: { marginBottom: t.space[6] },
    selectorContainer: { marginBottom: t.space[7] },
    label: { marginBottom: t.space[2] },
    unitSelector: { flexDirection: "row", gap: t.space[2] },
    unitButton: {
      flex: 1,
      padding: t.space[3],
      borderRadius: t.radius.sm,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      backgroundColor: t.surfaceSunken,
      alignItems: "center",
    },
    unitButtonSelected: { backgroundColor: t.accent, borderColor: t.accent },
    amountScrollView: {
      maxHeight: 150,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.sm,
    },
    amountButton: {
      padding: t.space[3],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
      alignItems: "center",
    },
    amountButtonSelected: { backgroundColor: t.accent },
    buttonContainer: { flexDirection: "row", gap: t.space[3] },
    flex: { flex: 1 },
  });