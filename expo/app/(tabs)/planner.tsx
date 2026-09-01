import { useScrollToTop } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Image, Pressable, StyleSheet, Text as RNText, View } from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import InlineConfirm from "@/components/InlineConfirm";
import { useToast } from "@/components/Toast";
import type { Theme } from "@/constants/theme";
import { translateAmount, translateIngredientName } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import { useMealPlan, type PlanEntry } from "@/hooks/use-meal-plan";
import { useIsDesktop } from "@/hooks/use-responsive";
import { scaleAmount } from "@/lib/scale-amount";
import {
  addWeeks,
  formatDayLabel,
  formatWeekRange,
  isTodayIso,
  thisMondayIso,
  weekDates,
} from "@/lib/week";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { Recipe } from "@/types/recipe";

type PlannerView = "plan" | "shopping";
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

interface ShopLine {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
}
interface ShopSection {
  entry: PlanEntry;
  recipe: Recipe;
  day: string;
  lines: ShopLine[];
}

export default function PlannerScreen() {
  const { t, currentLanguage } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const listRef = useRef<FlatList<any>>(null);
  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => resetHeader(), []));

  const [view, setView] = useState<PlannerView>("plan");
  const [monday, setMonday] = useState<string>(thisMondayIso());
  const [confirmBought, setConfirmBought] = useState<string | null>(null);
  const { showToast } = useToast();

  const {
    entries,
    entriesByDay,
    removeFromPlan,
    setServings,
    setCooked,
    toggleIngredient,
    setAllIngredientsChecked,
    setBought,
  } = useMealPlan();

  const days = useMemo(() => weekDates(monday), [monday]);

  const allRecipes = useMemo(() => {
    const seen = new Map<string, Recipe>();
    for (const e of entries) if (!seen.has(e.recipe.id)) seen.set(e.recipe.id, e.recipe);
    return [...seen.values()];
  }, [entries]);
  const localized = useLocalizedRecipes(allRecipes);
  const localizedById = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of localized) m.set(r.id, r);
    return m;
  }, [localized]);

  const shopSections: ShopSection[] = useMemo(() => {
    return entries
      .filter((e) => !e.cookedAt && !e.boughtAt)
      .sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))
      .map((entry) => {
        const recipe = localizedById.get(entry.recipe.id) ?? entry.recipe;
        const base = entry.recipe.servings || recipe.servings || 1;
        const ratio = entry.servings / base;
        const lines: ShopLine[] = (recipe.ingredients ?? []).map((ing) => ({
          id: ing.id,
          name: translateIngredientName(currentLanguage, ing.name),
          amount: translateAmount(currentLanguage, scaleAmount(ing.amount, ratio)) || scaleAmount(ing.amount, ratio),
          checked: entry.checkedIngredients.includes(ing.id),
        }));
        return { entry, recipe, day: entry.day, lines };
      });
  }, [entries, localizedById, currentLanguage]);

  const segment = (
    <View style={styles.segmentWrap}>
      <SegmentedControl<PlannerView>
        options={[
          { value: "plan", label: t("planView"), icon: <Calendar size={15} color={view === "plan" ? theme.textPrimary : theme.textMuted} /> },
          { value: "shopping", label: t("shoppingView"), icon: <ShoppingCart size={15} color={view === "shopping" ? theme.textPrimary : theme.textMuted} /> },
        ]}
        value={view}
        onChange={setView}
        testID="planner-view"
      />
    </View>
  );

  // ---- Plan view ----

  const weekBar = (
    <View style={styles.weekBar}>
      <Pressable onPress={() => setMonday((m) => addWeeks(m, -1))} hitSlop={10} testID="planner-week-prev">
        <ChevronLeft size={22} color={theme.textPrimary} />
      </Pressable>
      <Pressable onPress={() => setMonday(thisMondayIso())} testID="planner-week-today">
        <Text variant="title">{formatWeekRange(monday, currentLanguage)}</Text>
      </Pressable>
      <Pressable onPress={() => setMonday((m) => addWeeks(m, 1))} hitSlop={10} testID="planner-week-next">
        <ChevronRight size={22} color={theme.textPrimary} />
      </Pressable>
    </View>
  );

  const renderDay = ({ item: day }: { item: string }) => {
    const dayEntries: PlanEntry[] = entriesByDay[day] ?? [];
    return (
      <View style={styles.daySection}>
        <RNText style={[styles.dayHeader, isTodayIso(day) && styles.dayHeaderToday]}>
          {formatDayLabel(day, currentLanguage)}
          {isTodayIso(day) ? ` · ${t("today")}` : ""}
        </RNText>
        {dayEntries.length === 0 ? (
          <Text variant="bodySm" color="muted" style={styles.emptyDay}>{t("emptyDayHint")}</Text>
        ) : (
          dayEntries.map((entry) => {
            const r = localizedById.get(entry.recipe.id) ?? entry.recipe;
            const cooked = !!entry.cookedAt;
            return (
              <View key={entry.id} style={[styles.mealRow, cooked && styles.mealRowCooked]}>
                <Pressable
                  onPress={() => setCooked(entry.id, !cooked)}
                  hitSlop={8}
                  style={[styles.cookToggle, cooked && styles.cookToggleOn]}
                  testID={`planner-cook-${entry.id}`}
                  accessibilityLabel={t("markCooked")}
                >
                  {cooked && <Check size={14} color={theme.textOnAccent} />}
                </Pressable>
                <Pressable
                  style={styles.mealMain}
                  onPress={() => router.push(`/recipe-detail?id=${entry.recipe.id}`)}
                  testID={`planner-meal-${entry.id}`}
                >
                  {r.image ? (
                    <Image source={{ uri: r.image }} style={styles.mealThumb} />
                  ) : (
                    <View style={[styles.mealThumb, styles.mealThumbFallback]} />
                  )}
                  <View style={styles.mealTextWrap}>
                    <Text variant="title" numberOfLines={2} style={cooked ? styles.strikethrough : undefined}>
                      {r.name}
                    </Text>
                    <View style={styles.mealMetaRow}>
                      <Text variant="caption" color="muted">
                        {entry.servings} {t("portions")}
                      </Text>
                      {!!entry.boughtAt && !cooked && (
                        <View style={styles.boughtChip}>
                          <ShoppingCart size={11} color={theme.success} />
                          <Text variant="caption" weight="bold" style={{ color: theme.success }}>{t("boughtChip")}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
                {cooked ? (
                  <View style={styles.mealRemove}>
                    <Check size={18} color={theme.success} />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => removeFromPlan(entry.id)}
                    hitSlop={10}
                    style={styles.mealRemove}
                    testID={`planner-meal-remove-${entry.id}`}
                  >
                    <X size={18} color={theme.textMuted} />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  };

  const planList = (
    <FlatList
      ref={listRef}
      data={days}
      keyExtractor={(d) => d}
      renderItem={renderDay}
      ListHeaderComponent={weekBar}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
    />
  );

  // ---- Shopping view ----

  const clampServings = (n: number) => Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, n));

  const renderSection = ({ item }: { item: ShopSection }) => {
    const { entry, recipe } = item;
    const allChecked = item.lines.length > 0 && item.lines.every((l) => l.checked);
    return (
      <View style={styles.shopCard}>
        <View style={styles.shopCardHead}>
          {recipe.image ? (
            <Image source={{ uri: recipe.image }} style={styles.shopThumb} />
          ) : (
            <View style={[styles.shopThumb, styles.mealThumbFallback]} />
          )}
          <View style={styles.shopHeadText}>
            <Text variant="title" numberOfLines={2}>{recipe.name}</Text>
            <View style={styles.shopHeadMeta}>
              <Text variant="bodySm" color="muted" style={styles.shrink}>{formatDayLabel(item.day, currentLanguage)}</Text>
              <View style={styles.miniStepper}>
                <Pressable
                  onPress={() => setServings(entry.id, clampServings(entry.servings - 1))}
                  hitSlop={6}
                  style={styles.miniStepBtn}
                  testID={`shop-servings-minus-${entry.id}`}
                >
                  <Minus size={13} color={theme.accent} />
                </Pressable>
                <Text variant="label" weight="bold" style={styles.miniStepValue}>{entry.servings}</Text>
                <Pressable
                  onPress={() => setServings(entry.id, clampServings(entry.servings + 1))}
                  hitSlop={6}
                  style={styles.miniStepBtn}
                  testID={`shop-servings-plus-${entry.id}`}
                >
                  <Plus size={13} color={theme.accent} />
                </Pressable>
                <Text variant="caption" color="muted">{t("portions")}</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => setAllIngredientsChecked(entry.id, !allChecked)}
            hitSlop={8}
            style={[styles.recipeCheck, allChecked && styles.recipeCheckReady]}
            testID={`shop-recipe-checkall-${entry.id}`}
            accessibilityLabel={t("checkOffRecipe")}
          >
            <Check size={18} color={allChecked ? theme.textOnAccent : theme.textMuted} />
          </Pressable>
        </View>

        {allChecked ? (
          <View style={styles.boughtWrap}>
            <Text variant="caption" color="muted" weight="semibold">
              {t("allIngredientsChecked")} · {item.lines.length}
            </Text>
            {confirmBought === entry.id ? (
              <InlineConfirm
                question={t("confirmShoppingDone")}
                confirmLabel={t("shoppingDoneBtn")}
                onConfirm={() => {
                  setBought(entry.id, true);
                  setConfirmBought(null);
                  showToast(t("shoppingDoneToast"), { icon: "check" });
                }}
                onCancel={() => setConfirmBought(null)}
              />
            ) : (
              <Button
                label={t("recipeBought")}
                fullWidth
                leftIcon={<ShoppingCart size={16} color={theme.textOnAccent} />}
                onPress={() => setConfirmBought(entry.id)}
                testID={`shop-bought-${entry.id}`}
              />
            )}
          </View>
        ) : (
          <View style={styles.shopLines}>
            {item.lines.map((line) => (
              <Pressable
                key={line.id}
                style={styles.shopLine}
                onPress={() => toggleIngredient(entry.id, line.id)}
                testID={`shop-line-${entry.id}-${line.id}`}
              >
                <View style={[styles.bullet, line.checked && styles.bulletChecked]}>
                  {line.checked && <Check size={12} color={theme.textOnAccent} />}
                </View>
                <Text variant="body" numberOfLines={2} style={[styles.lineName, line.checked && styles.strikethrough]}>
                  {line.name}
                </Text>
                {!!line.amount && (
                  <Text variant="bodySm" color="secondary" style={line.checked ? styles.strikethrough : undefined}>
                    {line.amount}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  const shoppingListEl = (
    <FlatList
      ref={listRef}
      data={shopSections}
      keyExtractor={(s) => s.entry.id}
      renderItem={renderSection}
      ListEmptyComponent={<EmptyState icon={<ShoppingCart size={24} color={theme.textMuted} />} title={t("noPlannedMeals")} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onScroll={isDesktop ? undefined : onHeaderScroll}
      scrollEventThrottle={16}
    />
  );

  const body = (
    <>
      {segment}
      {view === "plan" ? planList : shoppingListEl}
    </>
  );

  return (
    <View style={styles.container}>
      {!isDesktop && <CollapsingTabHeader />}
      {isDesktop ? (
        body
      ) : (
        <Animated.View
          style={[
            styles.body,
            { paddingTop: topPad, marginBottom: -topPad, transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          {body}
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    body: { flex: 1 },
    segmentWrap: { marginHorizontal: t.space[5], marginTop: t.space[4], marginBottom: t.space[1] },
    listContent: { padding: t.space[5], paddingBottom: t.space[10] },
    weekBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: t.space[3],
      paddingHorizontal: t.space[1],
      marginBottom: t.space[3],
    },
    strikethrough: { textDecorationLine: "line-through" },

    // Plan view
    daySection: { marginBottom: t.space[6] },
    dayHeader: {
      fontFamily: t.font.bodyBold,
      fontSize: 12,
      color: t.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: t.space[3],
    },
    dayHeaderToday: { color: t.accent },
    emptyDay: { fontStyle: "italic" },
    mealRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      padding: t.space[3],
      marginBottom: t.space[3],
      gap: t.space[3],
    },
    mealRowCooked: { backgroundColor: t.successSubtle, borderColor: "transparent" },
    cookToggle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: t.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    cookToggleOn: { backgroundColor: t.success, borderColor: t.success },
    mealMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: t.space[3] },
    mealThumb: { width: 48, height: 48, borderRadius: t.radius.sm, backgroundColor: t.surfaceSunken },
    mealThumbFallback: { backgroundColor: t.surfaceSunken },
    mealTextWrap: { flex: 1 },
    mealMetaRow: { flexDirection: "row", alignItems: "center", gap: t.space[3], marginTop: 2 },
    boughtChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: t.successSubtle,
      borderRadius: t.radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    mealRemove: { padding: t.space[3] },

    // Shopping view
    shopCard: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.lg,
      padding: t.space[4],
      marginBottom: t.space[4],
    },
    shopCardHead: { flexDirection: "row", gap: t.space[4], marginBottom: t.space[3], alignItems: "flex-start" },
    recipeCheck: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: t.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    recipeCheckReady: { backgroundColor: t.success, borderColor: t.success },
    shopThumb: { width: 56, height: 56, borderRadius: t.radius.sm, backgroundColor: t.surfaceSunken },
    shopHeadText: { flex: 1 },
    shopHeadMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: t.space[2],
      gap: t.space[3],
    },
    shrink: { flexShrink: 1 },
    miniStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space[3],
      paddingVertical: 3,
    },
    miniStepBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    miniStepValue: { minWidth: 16, textAlign: "center" },
    shopLines: { gap: 2 },
    boughtWrap: { gap: t.space[3], marginTop: t.space[1] },
    shopLine: { flexDirection: "row", alignItems: "center", gap: t.space[3], paddingVertical: t.space[3] },
    bullet: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: t.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    bulletChecked: { backgroundColor: t.success, borderColor: t.success },
    lineName: { flex: 1 },
  });
