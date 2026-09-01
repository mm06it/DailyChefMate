import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Plus, Minus, X as XIcon, Check, Camera, Trash2 } from "lucide-react-native";

import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useRecipeImageUpload, pickRecipeImage, type PickedImage } from "@/hooks/use-recipe-image";
import { translateText } from "@/constants/translations";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { Recipe } from "@/types/recipe";
import ResponsiveContainer from "@/components/ResponsiveContainer";

type RecipeMode = "cooking" | "baking";
type Visibility = "private" | "public";

interface FormIngredient {
  name: string;
  qty: string;
  unit: string;
}

interface RecipeFormData {
  name: string;
  visibility: Visibility | null;
  mode: RecipeMode | null;
  prepTime: string; // Vorbereitungszeit — both modes
  cookTime: string; // Kochzeit — cooking only
  ovenTime: string; // Zeit im Backrohr — baking only
  ovenHeat: string; // Hitze °C — baking only
  ovenMode: string; // Ofenmodus — baking only
  servings: string; // Portionen — cooking only
  category: string;
  ingredients: FormIngredient[];
  steps: string[];
}

const CATEGORIES_BY_MODE: Record<RecipeMode, string[]> = {
  cooking: ['Hauptspeise', 'Vorspeise', 'Dessert', 'Snack', 'Suppe', 'Salat'],
  baking: ['Vorspeise', 'Hauptspeise', 'Dessert', 'Snack'],
};

const OVEN_MODES = [
  'Ober-/Unterhitze',
  'Umluft',
  'Heißluft',
  'Grill',
  'Umluftgrill',
];

// Amount units for the ingredient picker. "" = no unit (bare number).
const AMOUNT_UNITS = [
  'g', 'kg', 'ml', 'l', 'Stück', 'EL', 'TL', 'Prise', 'Tasse', 'Bund',
  'Dose', 'Packung', 'Zehe', 'Scheibe', 'nach Geschmack',
];
const NO_QTY_UNITS = new Set(['nach Geschmack']);

const composeAmount = (ing: FormIngredient): string => {
  if (NO_QTY_UNITS.has(ing.unit)) return ing.unit;
  return [ing.qty.trim(), ing.unit.trim()].filter(Boolean).join(' ').trim();
};

// Split a stored amount string ("250 g", "1 Prise", "etwas") back into qty + unit.
const parseAmount = (amount: string): { qty: string; unit: string } => {
  const raw = (amount ?? '').trim();
  if (!raw) return { qty: '', unit: '' };
  const m = raw.match(/^([\d]+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(.*)$/);
  if (m) {
    const unit = m[2].trim();
    return { qty: m[1].trim(), unit: AMOUNT_UNITS.includes(unit) ? unit : unit };
  }
  return { qty: '', unit: NO_QTY_UNITS.has(raw) ? raw : raw };
};

const num = (v: string) => parseInt((v ?? '').replace(/[^0-9]/g, '') || '0', 10) || 0;

// Everything below the name/mode row is per-mode: what you type under
// "Kochen" is kept apart from "Backen" and vice versa.
type ModeSlice = Pick<
  RecipeFormData,
  | 'prepTime'
  | 'cookTime'
  | 'ovenTime'
  | 'ovenHeat'
  | 'ovenMode'
  | 'servings'
  | 'category'
  | 'ingredients'
  | 'steps'
>;

const freshModeSlice = (): ModeSlice => ({
  prepTime: '0',
  cookTime: '0',
  ovenTime: '0',
  ovenHeat: '',
  ovenMode: '',
  servings: '',
  category: '',
  ingredients: [{ name: '', qty: '', unit: '' }],
  steps: [''],
});

const pickModeSlice = (fd: RecipeFormData): ModeSlice => ({
  prepTime: fd.prepTime,
  cookTime: fd.cookTime,
  ovenTime: fd.ovenTime,
  ovenHeat: fd.ovenHeat,
  ovenMode: fd.ovenMode,
  servings: fd.servings,
  category: fd.category,
  ingredients: fd.ingredients,
  steps: fd.steps,
});

export default function AddRecipeScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, currentLanguage } = useLanguage();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addCustomRecipe, updateCustomRecipe, getCustomRecipe } = useDailyChefMateStore();
  const { pickAndUpload, uploadPicked, removeImage, uploading } = useRecipeImageUpload();
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
    visibility: null,
    mode: null,
    prepTime: "0",
    cookTime: "0",
    ovenTime: "0",
    ovenHeat: "",
    ovenMode: "",
    servings: "",
    category: "",
    ingredients: [{ name: "", qty: "", unit: "" }],
    steps: [""],
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState<boolean>(false);
  const [showOvenModePicker, setShowOvenModePicker] = useState<boolean>(false);
  const [openUnitRow, setOpenUnitRow] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditing = !!editId;

  useEffect(() => () => {
    if (navTimer.current) clearTimeout(navTimer.current);
  }, []);

  // Per-mode field snapshots, so toggling Kochen/Backen keeps each side's
  // data to itself instead of bleeding across.
  const savedByMode = useRef<{ cooking?: ModeSlice; baking?: ModeSlice }>({});

  const selectMode = (next: RecipeMode) => {
    setShowCategoryPicker(false);
    setShowOvenModePicker(false);
    setFormData((prev) => {
      if (prev.mode === next) return prev;
      if (prev.mode) savedByMode.current[prev.mode] = pickModeSlice(prev);
      const restored = savedByMode.current[next] ?? freshModeSlice();
      return { name: prev.name, visibility: prev.visibility, mode: next, ...restored };
    });
  };

  const isEmpty = useCallback((v: string) => (v ?? '').trim().length === 0, []);

  // Only the fields relevant to the chosen mode are validated — that keeps
  // the asterisks (and the save gate) honest about what's actually needed.
  const invalid = useMemo(() => {
    const base = {
      name: isEmpty(formData.name),
      visibility: formData.visibility === null,
      mode: formData.mode === null,
      category: isEmpty(formData.category),
      ingredients: formData.ingredients.some(
        (ing) => isEmpty(ing.name) || isEmpty(composeAmount(ing)),
      ),
      steps: formData.steps.some((step) => isEmpty(step)),
      cookTime: false,
      ovenTime: false,
      ovenHeat: false,
      ovenMode: false,
      servings: false,
    };
    if (formData.mode === 'cooking') {
      base.cookTime = num(formData.cookTime) <= 0;
      base.servings = isEmpty(formData.servings) || num(formData.servings) <= 0;
    } else if (formData.mode === 'baking') {
      base.ovenTime = num(formData.ovenTime) <= 0;
      base.ovenHeat = isEmpty(formData.ovenHeat) || num(formData.ovenHeat) <= 0;
      base.ovenMode = isEmpty(formData.ovenMode);
    }
    return base;
  }, [formData, isEmpty]);

  const hasErrors = useMemo(() => Object.values(invalid).some(Boolean), [invalid]);

  const mainTime = formData.mode === 'baking' ? num(formData.ovenTime) : num(formData.cookTime);
  const totalMinutes = num(formData.prepTime) + mainTime;

  // Load recipe data if editing
  useEffect(() => {
    if (isEditing && editId) {
      const recipe = getCustomRecipe(editId);
      if (recipe) {
        const inferredMode: RecipeMode =
          recipe.mode === 'baking' || recipe.mode === 'cooking'
            ? recipe.mode
            : recipe.ovenMode || (recipe.ovenHeat && !/^0\s*°/.test(recipe.ovenHeat))
              ? 'baking'
              : 'cooking';
        setFormData({
          name: recipe.name,
          visibility: recipe.visibility === 'private' ? 'private' : 'public',
          mode: inferredMode,
          prepTime: recipe.prepTime?.replace(/[^0-9]/g, '') || '0',
          cookTime: recipe.cookTime?.replace(/[^0-9]/g, '') || '0',
          ovenTime: recipe.ovenTime?.replace(/[^0-9]/g, '') || '0',
          ovenHeat: recipe.ovenHeat?.replace(/[^0-9]/g, '') ?? '',
          ovenMode: recipe.ovenMode ?? '',
          servings: recipe.servings ? String(recipe.servings) : '',
          category: recipe.category,
          ingredients: recipe.ingredients.map((ing) => ({
            name: ing.name,
            ...parseAmount(ing.amount),
          })),
          steps: recipe.steps.length ? recipe.steps : [''],
        });
      }
    }
  }, [isEditing, editId, getCustomRecipe]);

  const handleSave = async () => {
    if (saving) return; // ignore rapid double-taps
    if (hasErrors) {
      // Inline banner + the red asterisks only — no blocking popup.
      setErrorMessage(t('fillHighlightedFields'));
      return;
    }
    setErrorMessage(null);
    setSaving(true);

    const mode = formData.mode as RecipeMode;
    const main = mode === 'baking' ? num(formData.ovenTime) : num(formData.cookTime);
    const total = num(formData.prepTime) + main;

    const recipeData: Omit<Recipe, 'id'> = {
      name: formData.name.trim(),
      image: "",
      rating: 0,
      mode,
      cookTime: `${main} min`,
      prepTime: `${num(formData.prepTime)} min`,
      totalTime: `${total} min`,
      ovenHeat: mode === 'baking' ? `${num(formData.ovenHeat)} °C` : undefined,
      ovenTime: mode === 'baking' ? `${num(formData.ovenTime)} min` : undefined,
      ovenMode: mode === 'baking' ? formData.ovenMode : undefined,
      servings: mode === 'cooking' ? num(formData.servings) : 1,
      category: formData.category,
      visibility: formData.visibility ?? 'public',
      ingredients: formData.ingredients.map((ing, index) => ({
        id: `ingredient_${index}`,
        name: ing.name.trim(),
        amount: composeAmount(ing),
        category: 'Custom',
      })),
      steps: formData.steps.map((step) => step.trim()),
      isFavorite: false,
    };

    try {
      if (isEditing && editId) {
        updateCustomRecipe(editId, recipeData);
        setSuccessMessage(t('recipeUpdated'));
      } else {
        const newId = await addCustomRecipe(recipeData);
        // Attach the photo the user picked while creating.
        if (newId && pickedImage) {
          await uploadPicked(newId, pickedImage);
        }
        setSuccessMessage(t('recipeCreated'));
      }
      // Let the green confirmation show for a beat, then go back.
      navTimer.current = setTimeout(() => router.back(), 1200);
    } catch (error) {
      console.error('Error saving recipe:', error);
      setErrorMessage('Failed to save recipe');
      setSaving(false); // stay on the form so the user can retry
    }
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", qty: "", unit: "" }],
    }));
  };

  const removeIngredient = (index: number) => {
    if (formData.ingredients.length > 1) {
      setFormData((prev) => ({
        ...prev,
        ingredients: prev.ingredients.filter((_, i) => i !== index),
      }));
    }
  };

  const updateIngredient = (index: number, patch: Partial<FormIngredient>) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({ ...prev, steps: [...prev.steps, ""] }));
  };

  const removeStep = (index: number) => {
    if (formData.steps.length > 1) {
      setFormData((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
    }
  };

  const updateStep = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? value : step)),
    }));
  };

  const stepTime = (key: 'prepTime' | 'cookTime' | 'ovenTime', delta: number) => {
    setFormData((prev) => ({ ...prev, [key]: String(Math.max(0, num(prev[key]) + delta)) }));
  };

  const renderTimeField = (
    key: 'prepTime' | 'cookTime' | 'ovenTime',
    label: string,
    placeholder: string,
    showError: boolean,
  ) => (
    <View style={[styles.section, styles.sectionDense]}>
      <View style={[styles.labelContainer, styles.labelContainerDense]}>
        <Text style={styles.label} numberOfLines={2}>
          {label} {showError && <Text style={styles.required}>*</Text>}
        </Text>
      </View>
      <View style={styles.timeRowWrap}>
        <View style={styles.timeRow}>
          <Pressable testID={`${key}-decrement`} onPress={() => stepTime(key, -5)} style={styles.timeButton}>
            <Minus size={18} color={theme.textPrimary} />
          </Pressable>
          <View style={styles.timeValueBox}>
            <Text testID={`${key}-value`} style={styles.timeValueText}>{num(formData[key])} min</Text>
          </View>
          <Pressable testID={`${key}-increment`} onPress={() => stepTime(key, 5)} style={styles.timeButton}>
            <Plus size={18} color={theme.textPrimary} />
          </Pressable>
        </View>
        <TextInput
          testID={`${key}-input`}
          style={[styles.input, styles.inputDense, styles.manualInput]}
          value={formData[key]}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, [key]: text.replace(/[^0-9]/g, '') }))}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  // Photo: edit mode uploads immediately (recipe exists); create mode keeps
  // the pick local and uploads right after the recipe is saved.
  const editingRecipe = isEditing && editId ? getCustomRecipe(editId) : undefined;
  const photoUri = isEditing ? editingRecipe?.image || null : pickedImage?.uri ?? null;

  const handlePickPhoto = async () => {
    if (isEditing && editId) {
      await pickAndUpload(editId);
    } else {
      const p = await pickRecipeImage();
      if (p) setPickedImage(p);
    }
  };
  const handleRemovePhoto = async () => {
    if (isEditing && editId) await removeImage(editId);
    else setPickedImage(null);
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
                <XIcon size={22} color={theme.textPrimary} />
              </Pressable>
            )
          ),
          headerRight: () => (
            <Pressable
              testID="header-save"
              onPress={handleSave}
              disabled={saving}
              style={[styles.headerSave, saving && { opacity: 0.4 }]}
              accessibilityLabel={t('save')}
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.success} />
              ) : (
                <Check size={22} color={theme.success} />
              )}
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

      {successMessage && (
        <View style={styles.fixedBannerContainer}>
          <View testID="success-banner" style={styles.successBanner}>
            <Text style={styles.successBannerText}>{successMessage}</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              placeholder={t('enterRecipeName')}
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Private vs. public — nothing below shows until this is picked */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('recipeVisibility')} {invalid.visibility && (<Text style={styles.required}>*</Text>)}
            </Text>
            <View style={styles.modeRow}>
              <Pressable
                testID="visibility-private"
                style={[styles.modeButton, formData.visibility === 'private' && styles.modeButtonActive]}
                onPress={() => setFormData((prev) => ({ ...prev, visibility: 'private' }))}
              >
                <Text style={[styles.modeButtonText, formData.visibility === 'private' && styles.modeButtonTextActive]}>
                  {t('visibilityPrivate')}
                </Text>
              </Pressable>
              <Pressable
                testID="visibility-public"
                style={[styles.modeButton, formData.visibility === 'public' && styles.modeButtonActive]}
                onPress={() => setFormData((prev) => ({ ...prev, visibility: 'public' }))}
              >
                <Text style={[styles.modeButtonText, formData.visibility === 'public' && styles.modeButtonTextActive]}>
                  {t('visibilityPublic')}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.visibilityHint}>
              {formData.visibility === 'private'
                ? t('visibilityPrivateHint')
                : formData.visibility === 'public'
                  ? t('visibilityPublicHint')
                  : ''}
            </Text>
          </View>

          {/* Photo — optional, shown once visibility is chosen */}
          {formData.visibility !== null && (
            <View style={styles.section}>
              <Text style={styles.label}>{t('recipePhoto')}</Text>
              <View style={styles.photoRow}>
                <View style={styles.photoPreview}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImg} />
                  ) : (
                    <Camera size={26} color={theme.textMuted} />
                  )}
                </View>
                <View style={styles.photoActions}>
                  <Pressable
                    style={styles.photoBtn}
                    onPress={handlePickPhoto}
                    disabled={uploading}
                    testID="button-pick-photo"
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <>
                        <Camera size={16} color={theme.accent} />
                        <Text style={styles.photoBtnText}>
                          {t(photoUri ? 'changePhoto' : 'addPhoto')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {photoUri && (
                    <Pressable
                      style={styles.photoBtnGhost}
                      onPress={handleRemovePhoto}
                      disabled={uploading}
                      testID="button-remove-photo"
                    >
                      <Trash2 size={14} color="#ef4444" />
                      <Text style={styles.photoBtnGhostText}>{t('removePhoto')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              <Text style={styles.visibilityHint}>{t('photoRetryHint')}</Text>
            </View>
          )}

          {/* Cooking vs. baking — only after visibility is chosen */}
          {formData.visibility !== null && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('chooseRecipeType')} {invalid.mode && (<Text style={styles.required}>*</Text>)}
            </Text>
            <View style={styles.modeRow}>
              <Pressable
                testID="mode-cooking"
                style={[styles.modeButton, formData.mode === 'cooking' && styles.modeButtonActive]}
                onPress={() => selectMode('cooking')}
              >
                <Text style={[styles.modeButtonText, formData.mode === 'cooking' && styles.modeButtonTextActive]}>
                  {t('modeCooking')}
                </Text>
              </Pressable>
              <Pressable
                testID="mode-baking"
                style={[styles.modeButton, formData.mode === 'baking' && styles.modeButtonActive]}
                onPress={() => selectMode('baking')}
              >
                <Text style={[styles.modeButtonText, formData.mode === 'baking' && styles.modeButtonTextActive]}>
                  {t('modeBaking')}
                </Text>
              </Pressable>
            </View>
          </View>
          )}

          {formData.visibility !== null && formData.mode !== null && (
            <>
              {/* Times */}
              {renderTimeField('prepTime', t('preparationTime'), t('enterPreparationTime'), false)}

              {formData.mode === 'cooking'
                ? renderTimeField('cookTime', t('cookingTime'), t('enterCookingTime'), invalid.cookTime)
                : renderTimeField('ovenTime', t('ovenTime'), t('enterOvenTime'), invalid.ovenTime)}

              <View style={[styles.section, styles.sectionDense]}>
                <Text style={styles.label}>{t('totalTime')}</Text>
                <View style={[styles.input, styles.inputDense, styles.readonlyBox]}>
                  <Text testID="computed-total-time" style={[styles.timeValueText, styles.centerText]}>
                    {totalMinutes} min
                  </Text>
                </View>
              </View>

              {/* Cooking: servings. Baking: oven heat + oven mode side by side. */}
              {formData.mode === 'cooking' ? (
                <View style={styles.section}>
                  <Text style={styles.label}>
                    {t('servingSize')} {invalid.servings && (<Text style={styles.required}>*</Text>)}
                  </Text>
                  <TextInput
                    testID="input-servings"
                    style={styles.input}
                    value={formData.servings}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, servings: text.replace(/[^0-9]/g, '') }))}
                    placeholder={t('enterServings')}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.row}>
                    <View style={[styles.halfWidth]}>
                      <Text style={styles.label} numberOfLines={2}>
                        {t('ovenHeat')} {invalid.ovenHeat && (<Text style={styles.required}>*</Text>)}
                      </Text>
                      <TextInput
                        testID="input-oven-heat"
                        style={styles.input}
                        value={formData.ovenHeat}
                        onChangeText={(text) => setFormData((prev) => ({ ...prev, ovenHeat: text.replace(/[^0-9]/g, '') }))}
                        placeholder={t('enterOvenHeat')}
                        placeholderTextColor={theme.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.halfWidth]}>
                      <Text style={styles.label} numberOfLines={2}>
                        {t('ovenMode')} {invalid.ovenMode && (<Text style={styles.required}>*</Text>)}
                      </Text>
                      <Pressable
                        testID="button-oven-mode"
                        style={[styles.input, styles.categoryButton]}
                        onPress={() => setShowOvenModePicker(!showOvenModePicker)}
                      >
                        <Text
                          style={[styles.categoryText, !formData.ovenMode && styles.placeholder]}
                          numberOfLines={1}
                        >
                          {formData.ovenMode
                            ? translateText(currentLanguage, formData.ovenMode)
                            : t('selectOvenMode')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {showOvenModePicker && (
                    <View style={styles.categoryPicker}>
                      {OVEN_MODES.map((m) => (
                        <Pressable
                          testID={`option-oven-mode-${m}`}
                          key={m}
                          style={styles.categoryOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, ovenMode: m }));
                            setShowOvenModePicker(false);
                          }}
                        >
                          <Text style={styles.categoryOptionText}>{translateText(currentLanguage, m)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

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
                    {formData.category
                      ? translateText(currentLanguage, formData.category)
                      : t('selectCategory')}
                  </Text>
                </Pressable>

                {showCategoryPicker && (
                  <View style={styles.categoryPicker}>
                    {(formData.mode ? CATEGORIES_BY_MODE[formData.mode] : []).map((category) => (
                      <Pressable
                        testID={`option-category-${category}`}
                        key={category}
                        style={styles.categoryOption}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, category }));
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={styles.categoryOptionText}>{translateText(currentLanguage, category)}</Text>
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
                    <Plus size={16} color={theme.accent} />
                    <Text style={styles.addButtonText}>{t('addIngredientToRecipe')}</Text>
                  </Pressable>
                </View>

                {formData.ingredients.map((ingredient, index) => {
                  const noQty = NO_QTY_UNITS.has(ingredient.unit);
                  return (
                    <View key={index}>
                      <View style={styles.ingredientRow}>
                        <TextInput
                          testID={`input-ingredient-name-${index}`}
                          style={[styles.input, styles.ingredientNameInput]}
                          value={ingredient.name}
                          onChangeText={(text) => updateIngredient(index, { name: text })}
                          placeholder={t('enterIngredientName')}
                          placeholderTextColor={theme.textMuted}
                        />
                        {!noQty && (
                          <TextInput
                            testID={`input-ingredient-qty-${index}`}
                            style={[styles.input, styles.ingredientQtyInput]}
                            value={ingredient.qty}
                            onChangeText={(text) =>
                              updateIngredient(index, { qty: text.replace(/[^0-9.,/]/g, '') })
                            }
                            placeholder={t('amountShort')}
                            placeholderTextColor={theme.textMuted}
                            keyboardType="numeric"
                          />
                        )}
                        <Pressable
                          testID={`button-ingredient-unit-${index}`}
                          style={[styles.input, styles.ingredientUnitButton, noQty && styles.ingredientUnitWide]}
                          onPress={() => setOpenUnitRow(openUnitRow === index ? null : index)}
                        >
                          <Text
                            style={[styles.categoryText, !ingredient.unit && styles.placeholder]}
                            numberOfLines={1}
                          >
                            {ingredient.unit
                              ? translateText(currentLanguage, ingredient.unit)
                              : t('unitLabel')}
                          </Text>
                        </Pressable>
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
                      {openUnitRow === index && (
                        <View style={styles.categoryPicker}>
                          {AMOUNT_UNITS.map((u) => (
                            <Pressable
                              key={u}
                              testID={`option-unit-${index}-${u}`}
                              style={styles.categoryOption}
                              onPress={() => {
                                updateIngredient(index, {
                                  unit: u,
                                  ...(NO_QTY_UNITS.has(u) ? { qty: '' } : {}),
                                });
                                setOpenUnitRow(null);
                              }}
                            >
                              <Text style={styles.categoryOptionText}>
                                {translateText(currentLanguage, u)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Steps */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>
                    {t('recipeSteps')} {invalid.steps && (<Text style={styles.required}>*</Text>)}
                  </Text>
                  <Pressable testID="button-add-step" onPress={addStep} style={styles.addButton}>
                    <Plus size={16} color={theme.accent} />
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
                      placeholderTextColor={theme.textMuted}
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
                disabled={saving}
                style={[styles.primarySaveButton, saving && { opacity: 0.6 }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primarySaveButtonText}>{t('saveRecipe')}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
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
  primarySaveButton: {
    backgroundColor: t.accent,
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
    color: t.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: t.textPrimary,
    backgroundColor: t.surface,
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
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: t.accent,
    borderColor: t.accent,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: t.textPrimary,
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },
  categoryButton: {
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: t.textPrimary,
  },
  placeholder: {
    color: t.textSecondary,
  },
  categoryPicker: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    backgroundColor: t.surface,
    maxHeight: 240,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  categoryOptionText: {
    fontSize: 16,
    color: t.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: t.accent,
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
  ingredientQtyInput: {
    width: 56,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  ingredientUnitButton: {
    width: 96,
    justifyContent: 'center',
  },
  ingredientUnitWide: {
    flex: 1,
    width: undefined,
  },
  visibilityHint: {
    fontSize: 13,
    color: t.textSecondary,
    marginTop: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  photoPreview: {
    width: 96,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    flex: 1,
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.accent,
    backgroundColor: t.surfaceSunken,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: t.accent,
  },
  photoBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  photoBtnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
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
    color: t.textPrimary,
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
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
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
    borderColor: t.border,
  },
  timeValueText: {
    fontSize: 16,
    color: t.textPrimary,
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
  },
  successBanner: {
    backgroundColor: t.success,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  successBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
