import { Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import Colors from "@/constants/colors";
import { categories } from "@/mocks/categories";
import { useFridgyStore } from "@/hooks/use-fridgy-store";

interface AddIngredientFormProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function AddIngredientForm({ isVisible, onClose }: AddIngredientFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const { addIngredient } = useFridgyStore();

  const handleSubmit = () => {
    if (name.trim() && amount.trim() && category) {
      addIngredient({
        name: name.trim(),
        amount: amount.trim(),
        category,
      });
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
            <Text style={styles.title}>Add New Ingredient</Text>
            <Pressable onPress={handleClose} hitSlop={10}>
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Tomatoes"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g., 500g, 2 pieces"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <Pressable 
                style={styles.categorySelector}
                onPress={() => setShowCategories(!showCategories)}
              >
                <Text style={category ? styles.input : styles.placeholderText}>
                  {category || "Select a category"}
                </Text>
              </Pressable>

              {showCategories && (
                <View style={styles.categoriesList}>
                  {categories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      style={styles.categoryItem}
                      onPress={() => selectCategory(cat.name)}
                    >
                      <Text style={styles.categoryText}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <Pressable 
              style={[
                styles.addButton,
                (!name.trim() || !amount.trim() || !category) && styles.addButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!name.trim() || !amount.trim() || !category}
            >
              <Plus size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add Ingredient</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingTop: 50,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
  },
  form: {
    paddingTop: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  categoriesList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    maxHeight: 200,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    marginLeft: 8,
  },
});