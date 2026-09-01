import { Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { translateText } from "@/constants/translations";
import { categories } from "@/mocks/categories";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface AddIngredientFormProps {
  isVisible: boolean;
  onClose: () => void;
}

const webNoOutline = { outlineStyle: "none" } as unknown as { [k: string]: string };

export default function AddIngredientForm({ isVisible, onClose }: AddIngredientFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const { addIngredient } = useDailyChefMateStore();
  const { t, currentLanguage } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const handleSubmit = () => {
    if (name.trim() && category) {
      addIngredient({ name: name.trim(), amount: amount.trim(), category });
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setName("");
    setAmount("");
    setCategory("");
    setShowCategories(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectCategory = (categoryName: string) => {
    setCategory(categoryName);
    setShowCategories(false);
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text variant="h3">{t('addNewIngredient')}</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text variant="label" color="secondary" style={styles.label}>{t('ingredientNameLabel')}</Text>
              <TextInput
                style={[styles.input, Platform.OS === "web" && webNoOutline]}
                value={name}
                onChangeText={setName}
                placeholder={t('egIngredientName')}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text variant="label" color="secondary" style={styles.label}>{t('amountOptionalLabel')}</Text>
              <TextInput
                style={[styles.input, Platform.OS === "web" && webNoOutline]}
                value={amount}
                onChangeText={setAmount}
                placeholder={t('egIngredientAmount')}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text variant="label" color="secondary" style={styles.label}>{t('ingredientCategoryLabel')}</Text>
              <Pressable style={styles.categorySelector} onPress={() => setShowCategories(!showCategories)}>
                <Text variant="body" color={category ? "primary" : "muted"}>
                  {category ? translateText(currentLanguage, category) : t('selectCategory')}
                </Text>
              </Pressable>

              {showCategories && (
                <View style={styles.categoriesList}>
                  {categories.map((cat) => (
                    <Pressable key={cat.id} style={styles.categoryItem} onPress={() => selectCategory(cat.name)}>
                      <Text variant="body">{translateText(currentLanguage, cat.name)}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Button
              label={t('addIngredientButton')}
              fullWidth
              disabled={!name.trim() || !category}
              leftIcon={<Plus size={18} color={theme.textOnAccent} />}
              onPress={handleSubmit}
              style={styles.addButton}
            />
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
      justifyContent: "flex-end",
      backgroundColor: t.overlay,
      paddingTop: 50,
    },
    modalContent: {
      backgroundColor: t.surfaceRaised,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingHorizontal: t.space[5],
      paddingBottom: t.space[8],
      ...t.elevation.lg,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: t.space[5],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    form: { paddingTop: t.space[5] },
    inputContainer: { marginBottom: t.space[4] },
    label: { marginBottom: t.space[2] },
    input: {
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.textPrimary,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      padding: t.space[3],
    },
    categorySelector: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      padding: t.space[3],
    },
    categoriesList: {
      marginTop: t.space[2],
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      maxHeight: 200,
    },
    categoryItem: {
      padding: t.space[3],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    addButton: { marginTop: t.space[2] },
  });
