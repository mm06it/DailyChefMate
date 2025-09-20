import { X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { translateText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { Ingredient } from "@/types/recipe";

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
  const [selectedUnit, setSelectedUnit] = useState<'g' | 'ml' | 'Stück'>('g');
  const [selectedAmount, setSelectedAmount] = useState(1);
  const { currentLanguage } = useLanguage();

  const defaultUnitFromIngredient = (ing: Ingredient | null): 'g' | 'ml' | 'Stück' => {
    const name = (ing?.name ?? '').toLowerCase().trim();
    if (!name) return 'g';
    if (["milk", "milch"].includes(name)) return 'ml';
    if (["flour", "mehl"].includes(name)) return 'g';
    if (["eggs", "eier", "egg", "ei"].includes(name)) return 'Stück';
    return 'g';
  };

  useEffect(() => {
    if (ingredient) {
      const unit = defaultUnitFromIngredient(ingredient);
      setSelectedUnit(unit);
      setSelectedAmount(1);
    }
  }, [ingredient, isVisible]);

  const getAmountOptions = () => {
    switch (selectedUnit) {
      case 'g':
        return Array.from({ length: 40 }, (_, i) => (i + 1) * 50); // 50g to 2000g in 50g steps
      case 'ml':
        return Array.from({ length: 40 }, (_, i) => (i + 1) * 50); // 50ml to 2000ml in 50ml steps
      case 'Stück':
        return Array.from({ length: 20 }, (_, i) => i + 1); // 1 to 20 pieces
      default:
        return [1];
    }
  };

  const units = ['g', 'ml', 'Stück'] as const;

  const handleConfirm = () => {
    if (ingredient) {
      const amountString = `${selectedAmount} ${selectedUnit}`;
      onConfirm(ingredient, amountString);
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
            <Text style={styles.title}>
              {translateText(currentLanguage, "Add Quantity") || "Menge hinzufügen"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.ingredientName}>
              {translateText(currentLanguage, ingredient.name) || ingredient.name}
            </Text>
            
            <View style={styles.selectorContainer}>
              <Text style={styles.label}>
                {translateText(currentLanguage, "Unit") || "Einheit"}
              </Text>
              <View style={styles.unitSelector}>
                {units.map((unit) => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.unitButton,
                      selectedUnit === unit && styles.unitButtonSelected
                    ]}
                    onPress={() => {
                      setSelectedUnit(unit);
                      setSelectedAmount(1);
                    }}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      selectedUnit === unit && styles.unitButtonTextSelected
                    ]}>
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.label}>
                {translateText(currentLanguage, "Amount") || "Menge"}
              </Text>
              <ScrollView 
                style={styles.amountScrollView}
                showsVerticalScrollIndicator={false}
              >
                {getAmountOptions().map((amount) => (
                  <Pressable
                    key={amount}
                    style={[
                      styles.amountButton,
                      selectedAmount === amount && styles.amountButtonSelected
                    ]}
                    onPress={() => setSelectedAmount(amount)}
                  >
                    <Text style={[
                      styles.amountButtonText,
                      selectedAmount === amount && styles.amountButtonTextSelected
                    ]}>
                      {amount}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>
                  {translateText(currentLanguage, "Cancel") || "Abbrechen"}
                </Text>
              </Pressable>
              
              <Pressable 
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {translateText(currentLanguage, "Add") || "Hinzufügen"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  content: {
    padding: 20,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 20,
  },
  selectorContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  unitSelector: {
    flexDirection: "row",
    gap: 8,
  },
  unitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
  },
  unitButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  unitButtonTextSelected: {
    color: "#FFF",
  },
  amountScrollView: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  amountButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: "center",
  },
  amountButtonSelected: {
    backgroundColor: Colors.primary,
  },
  amountButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  amountButtonTextSelected: {
    color: "#FFF",
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});