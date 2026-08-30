import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Plus, Minus, X as XIcon, Check } from "lucide-react-native";

import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import Colors from "@/constants/colors";
import { Recipe } from "@/types/recipe";
import ResponsiveContainer from "@/components/ResponsiveContainer";

interface RecipeFormData {
  name: string;
  cookTime: string;
  servings: string;
  category: string;
  ovenHeat: string;
  ovenTime: string;
  totalTime: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
}

const RECIPE_CATEGORIES = [
  'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Appetizer',
  'Main Course', 'Side Dish', 'Soup', 'Salad', 'Beverage', 'Other'
];

export default function AddRecipeScreen() {
  const { t } = useLanguage();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addCustomRecipe, updateCustomRecipe, getCustomRecipe } = useDailyChefMateStore();
  
  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
    cookTime: "0",
    servings: "",
    category: "",
    ovenHeat: "",
    ovenTime: "0",
    totalTime: "0",
    ingredients: [{ name: "", amount: "" }],
    steps: [""],
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditing = !!editId;

  const isEmpty = useCallback((v: string) => (v ?? '').trim().length === 0, []);

  const invalid = useMemo(() => ({
    name: isEmpty(formData.name),
    cookTime: isEmpty(formData.cookTime),
    ovenTime: isEmpty(formData.ovenTime),
    ovenHeat: isEmpty(formData.ovenHeat),
    servings: isEmpty(formData.servings),
    category: isEmpty(formData.category),
    ingredients: formData.ingredients.some(ing => isEmpty(ing.name) || isEmpty(ing.amount)),
    steps: formData.steps.some(step => isEmpty(step)),
  }), [formData, isEmpty]);

  // Load recipe data if editing
  useEffect(() => {
    if (isEditing && editId) {
      const recipe = getCustomRecipe(editId);
      if (recipe) {
        setFormData({
          name: recipe.name,
          cookTime: (recipe.prepTime?.replace(' min', '') || recipe.cookTime.replace(' min', '')),
          servings: recipe.servings.toString(),
          category: recipe.category,
          ovenHeat: recipe.ovenHeat?.replace(' °C', '') ?? "",
          ovenTime: recipe.ovenTime?.replace(' min', '') ?? "",
          totalTime: recipe.totalTime?.replace(' min', '') ?? "",
          ingredients: recipe.ingredients.map(ing => ({ name: ing.name, amount: ing.amount })),
          steps: recipe.steps,
        });
      }
    }
  }, [isEditing, editId, getCustomRecipe]);

  useEffect(() => {
    const total = (parseInt(formData.cookTime || '0', 10) || 0) + (parseInt(formData.ovenTime || '0', 10) || 0);
    setFormData(prev => ({ ...prev, totalTime: String(total) }));
  }, [formData.cookTime, formData.ovenTime]);

  const handleSave = () => {
    const missingBasic = !formData.name.trim()
      || !formData.cookTime.trim()
      || !formData.servings.trim()
      || !formData.category.trim()
      || !formData.ovenHeat.trim()
      || !formData.ovenTime.trim();

    const hasEmptyIngredient = formData.ingredients.some(ing => !ing.name.trim() || !ing.amount.trim());
    const hasEmptyStep = formData.steps.some(step => !step.trim());

    if (missingBasic || hasEmptyIngredient || hasEmptyStep) {
      setErrorMessage(t('fillAllFields'));
      try {
        Alert.alert(t('required'), t('fillAllFields'));
      } catch (e) {
        console.log('Alert not available, falling back to inline error.');
      }
      return;
    }

    const totalMinutes = (parseInt(formData.cookTime || '0', 10) || 0) + (parseInt(formData.ovenTime || '0', 10) || 0);

    const recipeData: Omit<Recipe, 'id'> = {
      name: formData.name.trim(),
      image: "",
      rating: 0,
      cookTime: `${formData.cookTime.trim()} min`,
      prepTime: `${formData.cookTime.trim()} min`,
      ovenHeat: `${formData.ovenHeat.trim()} °C`,
      ovenTime: `${formData.ovenTime.trim()} min`,
      totalTime: `${String(totalMinutes)} min`,
      servings: parseInt(formData.servings.trim()),
      category: formData.category,
      ingredients: formData.ingredients.map((ing, index) => ({
        id: `ingredient_${index}`,
        name: ing.name.trim(),
        amount: ing.amount.trim(),
        category: 'Custom',
      })),
      steps: formData.steps.map(step => step.trim()),
      isFavorite: false,
    };

    try {
      if (isEditing && editId) {
        updateCustomRecipe(editId, recipeData);
        try { Alert.alert(t('recipeUpdated')); } catch (e) { console.log('Alert not available'); }
      } else {
        addCustomRecipe(recipeData);
        try { Alert.alert(t('recipeCreated')); } catch (e) { console.log('Alert not available'); }
      }
      router.back();
    } catch (error) {
      console.error('Error saving recipe:', error);
      try { Alert.alert('Error', 'Failed to save recipe'); } catch (e2) { console.log('Save error'); }
      setErrorMessage('Failed to save recipe');
    }
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", amount: "" }],
    }));
  };

  const removeIngredient = (index: number) => {
    if (formData.ingredients.length > 1) {
      setFormData(prev => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index),
      }));
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ""],
    }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      setFormData(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index),
      }));
    }
  };

  const updateStep = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? value : step)),
    }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: isEditing ? t('editRecipe') : t('createRecipe'),
          headerTitleAlign: 'center',
          headerLeft: () => (
            isEditing ? null : (
              <Pressable testID="header-cancel" onPress={() => router.back()} style={styles.headerCancel}>
                <XIcon size={22} color={Colors.text} />
              </Pressable>
            )
          ),
          headerRight: () => (
            <Pressable testID="header-save" onPress={handleSave} style={styles.headerSave} accessibilityLabel={t('save')}>
              <Check size={22} color={Colors.success} />
            </Pressable>
          ),
        }}
      />
      
      {errorMessage && (
        <View style={styles.fixedBannerContainer}>
          <View testID="validation-banner" style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            <Pressable
              testID="dismiss-validation"
              onPress={() => setErrorMessage(null)}
              style={styles.errorBannerClose}
              accessibilityLabel={t('cancel')}
            >
              <XIcon size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={640}>
        <View style={styles.form}>

          {/* Recipe Name */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('recipeName')} {invalid.name && (<Text style={styles.required}>*</Text>)}
            </Text>
            <TextInput
              testID="input-recipe-name"
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder={t('enterRecipeName')}
              placeholderTextColor={Colors.textLight}
            />
          </View>


          {/* Preparation Time, Oven Time, then Total Time (stacked) */}
          <View style={[styles.section, styles.sectionDense]}>
            <View style={[styles.labelContainer, styles.labelContainerDense]}>
              <Text style={styles.label} numberOfLines={2}>
                {t('preparationTime')} {invalid.cookTime && (<Text style={styles.required}>*</Text>)}
              </Text>
            </View>
            <View style={styles.timeRowWrap}>
              <View style={styles.timeRow}>
                <Pressable
                  testID="prep-decrement"
                  onPress={() => {
                    setFormData(prev => {
                      const current = parseInt(prev.cookTime || '0', 10) || 0;
                      const next = Math.max(0, current - 5);
                      return { ...prev, cookTime: String(next) };
                    });
                  }}
                  style={[styles.timeButton]}
                >
                  <Minus size={18} color={Colors.text} />
                </Pressable>
                <View style={styles.timeValueBox}>
                  <Text testID="prep-time-value" style={styles.timeValueText}>
                    {(parseInt(formData.cookTime || '0', 10) || 0)} min
                  </Text>
                </View>
                <Pressable
                  testID="prep-increment"
                  onPress={() => {
                    setFormData(prev => {
                      const current = parseInt(prev.cookTime || '0', 10) || 0;
                      const next = current + 5;
                      return { ...prev, cookTime: String(next) };
                    });
                  }}
                  style={[styles.timeButton]}
                >
                  <Plus size={18} color={Colors.text} />
                </Pressable>
              </View>
              <TextInput
                testID="input-prep-time"
                style={[styles.input, styles.inputDense, styles.manualInput]}
                value={formData.cookTime}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, cookTime: cleaned }));
                }}
                placeholder={t('enterPreparationTime')}
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.section, styles.sectionDense]}>
            <View style={[styles.labelContainer, styles.labelContainerDense]}>
              <Text style={styles.label} numberOfLines={2}>
                {t('ovenTime')} {invalid.ovenTime && (<Text style={styles.required}>*</Text>)}
              </Text>
            </View>
            <View style={styles.timeRowWrap}>
              <View style={styles.timeRow}>
                <Pressable
                  testID="oven-decrement"
                  onPress={() => {
                    setFormData(prev => {
                      const current = parseInt(prev.ovenTime || '0', 10) || 0;
                      const next = Math.max(0, current - 5);
                      return { ...prev, ovenTime: String(next) };
                    });
                  }}
                  style={[styles.timeButton]}
                >
                  <Minus size={18} color={Colors.text} />
                </Pressable>
                <View style={styles.timeValueBox}>
                  <Text testID="oven-time-value" style={styles.timeValueText}>
                    {(parseInt(formData.ovenTime || '0', 10) || 0)} min
                  </Text>
                </View>
                <Pressable
                  testID="oven-increment"
                  onPress={() => {
                    setFormData(prev => {
                      const current = parseInt(prev.ovenTime || '0', 10) || 0;
                      const next = current + 5;
                      return { ...prev, ovenTime: String(next) };
                    });
                  }}
                  style={[styles.timeButton]}
                >
                  <Plus size={18} color={Colors.text} />
                </Pressable>
              </View>
              <TextInput
                testID="input-oven-time"
                style={[styles.input, styles.inputDense, styles.manualInput]}
                value={formData.ovenTime}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, ovenTime: cleaned }));
                }}
                placeholder={t('enterOvenTime')}
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={[styles.section, styles.sectionDense]}>
            <Text style={styles.label}>
              {t('totalTime')}
            </Text>
            <View style={[styles.input, styles.inputDense, styles.readonlyBox]}>
              <Text testID="computed-total-time" style={[styles.timeValueText, styles.centerText]}>
                {(parseInt(formData.cookTime || '0', 10) || 0) + (parseInt(formData.ovenTime || '0', 10) || 0)} min
              </Text>
            </View>
          </View>

          {/* Oven Heat and Servings */}
          <View style={styles.row}>
            <View style={[styles.section, styles.sectionDense, styles.halfWidth]}>
              <View style={[styles.labelContainer, styles.labelContainerDense]}>
                <Text style={styles.label} numberOfLines={2}>
                  {t('ovenHeat')} {invalid.ovenHeat && (<Text style={styles.required}>*</Text>)}
                </Text>
              </View>
              <TextInput
                testID="input-oven-heat"
                style={[styles.input, styles.inputDense]}
                value={formData.ovenHeat}
                onChangeText={(text) => setFormData(prev => ({ ...prev, ovenHeat: text }))}
                placeholder={t('enterOvenHeat')}
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.section, styles.sectionDense, styles.halfWidth]}>
              <View style={[styles.labelContainer, styles.labelContainerDense]}>
                <Text style={styles.label} numberOfLines={2}>
                  {t('servingSize')} {invalid.servings && (<Text style={styles.required}>*</Text>)}
                </Text>
              </View>
              <TextInput
                testID="input-servings"
                style={[styles.input, styles.inputDense]}
                value={formData.servings}
                onChangeText={(text) => setFormData(prev => ({ ...prev, servings: text }))}
                placeholder={t('enterServings')}
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('recipeCategory')} {invalid.category && (<Text style={styles.required}>*</Text>)}
            </Text>
            <Pressable
              testID="button-category"
              style={[styles.input, styles.categoryButton]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={[styles.categoryText, !formData.category && styles.placeholder]}>
                {formData.category || t('selectCategory')}
              </Text>
            </Pressable>
            
            {showCategoryPicker && (
              <View style={styles.categoryPicker}>
                {RECIPE_CATEGORIES.map((category) => (
                  <Pressable
                    testID={`option-category-${category}`}
                    key={category}
                    style={styles.categoryOption}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, category }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>{category}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>
                {t('recipeIngredients')} {invalid.ingredients && (<Text style={styles.required}>*</Text>)}
              </Text>
              <Pressable testID="button-add-ingredient" onPress={addIngredient} style={styles.addButton}>
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.addButtonText}>{t('addIngredientToRecipe')}</Text>
              </Pressable>
            </View>
            
            {formData.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput
                  testID={`input-ingredient-name-${index}`}
                  style={[styles.input, styles.ingredientNameInput]}
                  value={ingredient.name}
                  onChangeText={(text) => updateIngredient(index, 'name', text)}
                  placeholder={t('enterIngredientName')}
                  placeholderTextColor={Colors.textLight}
                />
                <TextInput
                  testID={`input-ingredient-amount-${index}`}
                  style={[styles.input, styles.ingredientAmountInput]}
                  value={ingredient.amount}
                  onChangeText={(text) => updateIngredient(index, 'amount', text)}
                  placeholder={t('enterAmount')}
                  placeholderTextColor={Colors.textLight}
                />
                {formData.ingredients.length > 1 && (
                  <Pressable
                    testID={`button-remove-ingredient-${index}`}
                    onPress={() => removeIngredient(index)}
                    style={styles.removeButton}
                  >
                    <Minus size={16} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>
                {t('recipeSteps')} {invalid.steps && (<Text style={styles.required}>*</Text>)}
              </Text>
              <Pressable testID="button-add-step" onPress={addStep} style={styles.addButton}>
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.addButtonText}>{t('addStep')}</Text>
              </Pressable>
            </View>
            
            {formData.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <TextInput
                  testID={`input-step-${index}`}
                  style={[styles.input, styles.stepInput]}
                  value={step}
                  onChangeText={(text) => updateStep(index, text)}
                  placeholder={t('enterStepDescription')}
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                />
                {formData.steps.length > 1 && (
                  <Pressable
                    testID={`button-remove-step-${index}`}
                    onPress={() => removeStep(index)}
                    style={styles.removeButton}
                  >
                    <Minus size={16} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View style={styles.bottomSpacer} />

          <Pressable
            testID="button-save-recipe-bottom"
            onPress={handleSave}
            style={styles.primarySaveButton}
          >
            <Text style={styles.primarySaveButtonText}>{t('saveRecipe')}</Text>
          </Pressable>
        </View>
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  saveButton: {
    padding: 8,
  },
  headerSave: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  headerCancel: {
    padding: 8,
    marginRight: 4,
  },
  headerSaveText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerSaveIcon: {
    marginLeft: 2,
  },
  primarySaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primarySaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 8,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionDense: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelContainer: {
    height: 48,
    justifyContent: 'flex-end',
  },
  labelContainerDense: {
    height: 36,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    color: Colors.textLight,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  inputDense: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
  },
  categoryButton: {
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textLight,
  },
  categoryPicker: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.card,
    maxHeight: 200,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ingredientNameInput: {
    flex: 2,
  },
  ingredientAmountInput: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    minWidth: 24,
  },
  stepInput: {
    flex: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRowWrap: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeValueBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  timeValueText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  manualInput: {
    minWidth: 90,
    flexGrow: 1,
  },
  readonlyBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
    width: '100%',
  },
  fixedBannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  errorBannerClose: {
    padding: 6,
  }
});