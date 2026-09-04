import { CalendarCheck, CalendarPlus, Camera, Clock, Send, Star, Thermometer, Timer, Trash2, Users, UtensilsCrossed, Wind } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { getTranslation, translateText } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useRatings } from "@/hooks/use-ratings";
import { useRequireAuth } from "@/hooks/use-auth-gate";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Text } from "@/components/ui/Text";
import { Recipe } from "@/types/recipe";
import { bakingBaseMenge, formatMenge } from "@/lib/menge";

interface RecipeDetailHeaderProps {
  recipe: Recipe;
  onAddToPlan?: () => void;
  onShare?: () => void;
  justPlanned?: boolean;
  onChangePhoto?: () => void;
  onRemovePhoto?: () => void;
  photoBusy?: boolean;
}

export default function RecipeDetailHeader({
  recipe,
  onAddToPlan,
  onShare,
  justPlanned,
  onChangePhoto,
  onRemovePhoto,
  photoBusy,
}: RecipeDetailHeaderProps) {
  const { toggleFavorite, favorites } = useDailyChefMateStore();
  const { entries: planEntries } = useMealPlan();
  const { getRatingStats } = useRatings();
  const { currentLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const requireAuth = useRequireAuth();

  const ratingStat = getRatingStats(recipe.id);
  const displayRating = ratingStat && ratingStat.count > 0 ? ratingStat.avg : recipe.rating;
  const ratingCount = ratingStat?.count ?? 0;
  const [imageError, setImageError] = useState<boolean>(false);
  const showImage = !!recipe.image && !imageError;

  const favorited = useMemo(
    () => recipe.isFavorite || favorites.some((f) => f.id === recipe.id),
    [recipe.isFavorite, recipe.id, favorites],
  );
  const inPlan = useMemo(
    () => planEntries.some((e) => e.recipe.id === recipe.id),
    [planEntries, recipe.id],
  );

  const handleFavoritePress = () =>
    requireAuth(() => {
      const wasFav = favorited;
      toggleFavorite(recipe.id);
      showToast(
        wasFav ? t("removedFromFavoritesToast") : t("addedToFavoritesToast"),
        { icon: "star", variant: wasFav ? "info" : "success" },
      );
    });

  const showOven =
    recipe.mode === "baking" && !!(recipe.ovenHeat || recipe.ovenMode || recipe.ovenTime);
  // For baking recipes the top clock shows the total time; the oven block below
  // carries the bake time itself, so the two don't read as the same number.
  const topTime = showOven && recipe.totalTime ? recipe.totalTime : recipe.cookTime;

  const translatedName = useMemo(() => translateText(currentLanguage, recipe.name) || recipe.name, [currentLanguage, recipe.name]);
  const translatedCategory = useMemo(() => translateText(currentLanguage, recipe.category) || recipe.category, [currentLanguage, recipe.category]);

  const courseLabel = useMemo(() => {
    const lang = currentLanguage ?? "de";
    const labels: Record<string, { starter: string; main: string; dessert: string }> = {
      de: { starter: "Vorspeise", main: "Hauptspeise", dessert: "Nachspeise" },
      en: { starter: "Starter", main: "Main", dessert: "Dessert" },
    } as const;
    const cat = recipe.category?.toLowerCase() ?? "";
    let key: "starter" | "main" | "dessert" | null = null;
    if (recipe.course) {
      const c = recipe.course.toLowerCase();
      if (["vorspeise", "starter", "entrée", "entrada", "antipasto"].includes(c)) key = "starter";
      if (["hauptspeise", "main", "plat", "piatto principale"].includes(c)) key = "main";
      if (["nachspeise", "dessert", "postre"].includes(c)) key = "dessert";
    }
    if (!key) {
      if (cat === "dessert") key = "dessert";
      else if (cat === "starter" || cat === "salad" || cat === "side" || cat === "appetizer") key = "starter";
      else key = "main";
    }
    return (labels[lang] ?? labels.de)[key];
  }, [currentLanguage, recipe.category, recipe.course]);

  const GlassButton = ({ children, onPress, disabled, label, testID }: {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    label: string;
    testID?: string;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={styles.glassBtn}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.imageWrap}>
        {showImage ? (
          <Image source={{ uri: recipe.image }} style={styles.image} onError={() => setImageError(true)} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <UtensilsCrossed size={48} color={theme.textMuted} />
          </View>
        )}

        {onChangePhoto && (
          <View style={styles.photoControls}>
            <GlassButton
              onPress={onChangePhoto}
              disabled={photoBusy}
              label={t(showImage ? "changePhoto" : "addPhoto")}
              testID={`recipe-detail-${recipe.id}-photo`}
            >
              {photoBusy ? (
                <ActivityIndicator size="small" color={theme.textPrimary} />
              ) : (
                <Camera size={19} color={theme.textPrimary} />
              )}
            </GlassButton>
            {showImage && onRemovePhoto && (
              <GlassButton
                onPress={onRemovePhoto}
                disabled={photoBusy}
                label={t("removePhoto")}
                testID={`recipe-detail-${recipe.id}-photo-remove`}
              >
                <Trash2 size={18} color={theme.danger} />
              </GlassButton>
            )}
          </View>
        )}

        <View style={styles.headerActions}>
          {onShare && (
            <GlassButton onPress={() => requireAuth(onShare)} label={t("shareRecipe")} testID={`recipe-detail-${recipe.id}-share`}>
              <Send size={19} color={theme.textPrimary} />
            </GlassButton>
          )}
          {onAddToPlan && (
            <GlassButton onPress={() => requireAuth(onAddToPlan)} label={t("addToWeekPlan")} testID={`recipe-detail-${recipe.id}-plan`}>
              {justPlanned || inPlan ? (
                <CalendarCheck size={20} color={theme.success} />
              ) : (
                <CalendarPlus size={20} color={theme.textPrimary} />
              )}
            </GlassButton>
          )}
          <GlassButton onPress={handleFavoritePress} label={t("favorites")} testID={`recipe-detail-${recipe.id}-favorite`}>
            <Star size={20} color={favorited ? theme.star : theme.textPrimary} fill={favorited ? theme.star : "none"} />
          </GlassButton>
        </View>
      </View>

      <View style={styles.content}>
        <Text variant="h1" style={styles.title}>{translatedName}</Text>

        <View style={styles.badgesRow}>
          <Badge label={translatedCategory} tone="neutral" testID={`recipe-detail-${recipe.id}-category-badge`} />
          <Badge label={courseLabel} tone="neutral" testID={`recipe-detail-${recipe.id}-course-badge`} />
          <Badge label={`★ ${displayRating.toFixed(1)} (${ratingCount})`} tone="star" />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Clock size={16} color={theme.textMuted} />
            <Text variant="bodySm" color="secondary">{topTime}</Text>
          </View>
          <View style={styles.infoItem}>
            <Users size={16} color={theme.textMuted} />
            <Text variant="bodySm" color="secondary">
              {showOven
                ? `${getTranslation(currentLanguage, "amountLabel")} ${formatMenge(bakingBaseMenge(recipe))}`
                : `${recipe.servings} ${getTranslation(currentLanguage, "servings")}`}
            </Text>
          </View>
        </View>

        {showOven && (
          <View style={styles.ovenBlock}>
            <Text variant="caption" color="muted" style={styles.ovenBlockLabel}>
              {getTranslation(currentLanguage, "ovenSection")}
            </Text>
            <View style={styles.ovenGrid}>
              <View style={styles.ovenCell}>
                <Thermometer size={18} color={theme.accent} />
                <Text variant="bodySm" weight="semibold">{recipe.ovenHeat || "–"}</Text>
                <Text variant="caption" color="muted">{getTranslation(currentLanguage, "ovenHeatShort")}</Text>
              </View>
              <View style={[styles.ovenCell, styles.ovenCellMid]}>
                <Wind size={18} color={theme.accent} />
                <Text variant="bodySm" weight="semibold">{recipe.ovenMode || "–"}</Text>
                <Text variant="caption" color="muted">{getTranslation(currentLanguage, "ovenModeShort")}</Text>
              </View>
              <View style={styles.ovenCell}>
                <Timer size={18} color={theme.accent} />
                <Text variant="bodySm" weight="semibold">{recipe.ovenTime || "–"}</Text>
                <Text variant="caption" color="muted">{getTranslation(currentLanguage, "bakeTimeShort")}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { backgroundColor: t.bg },
    imageWrap: { position: "relative" },
    image: { width: "100%", height: 240, resizeMode: "cover" },
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.surfaceSunken,
    },
    headerActions: {
      position: "absolute",
      top: t.space[4],
      right: t.space[4],
      flexDirection: "row",
      gap: t.space[2],
    },
    photoControls: {
      position: "absolute",
      top: t.space[4],
      left: t.space[4],
      flexDirection: "row",
      gap: t.space[2],
    },
    glassBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
      ...t.elevation.sm,
    },
    content: { padding: t.space[5], gap: t.space[3] },
    title: {},
    badgesRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: t.space[2] },
    infoRow: { flexDirection: "row", alignItems: "center", gap: t.space[5], marginTop: t.space[1] },
    infoItem: { flexDirection: "row", alignItems: "center", gap: t.space[2] },
    ovenBlock: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      padding: t.space[3],
      marginTop: t.space[1],
    },
    ovenBlockLabel: {
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: t.space[3],
    },
    ovenGrid: { flexDirection: "row" },
    ovenCell: { flex: 1, alignItems: "center", gap: t.space[1] },
    ovenCellMid: {
      borderLeftWidth: t.borderWidth.hairline,
      borderRightWidth: t.borderWidth.hairline,
      borderColor: t.border,
    },
  });
