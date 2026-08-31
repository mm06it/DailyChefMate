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
import { Animated, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import Colors from "@/constants/colors";
import { translateAmount, translateIngredientName } from "@/constants/translations";
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
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const listRef = useRef<FlatList<any>>(null);
  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => resetHeader(), []));

  const [view, setView] = useState<PlannerView>("plan");
  const [monday, setMonday] = useState<string>(thisMondayIso());

  const {
    entries,
    entriesByDay,
    removeFromPlan,
    setServings,
    setCooked,
    toggleIngredient,
  } = useMealPlan();

  const days = useMemo(() => weekDates(monday), [monday]);

  // Localize every planned recipe once (names / ingredients), then look them
  // up by id for both views.
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

  // Shopping list: one section per still-uncooked planned recipe, soonest
  // first ("next to cook" on top). Amounts are scaled to the entry's servings.
  const shopSections: ShopSection[] = useMemo(() => {
    return entries
      .filter((e) => !e.cookedAt)
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
    <View style={styles.segment}>
      <Pressable
        style={[styles.segmentBtn, view === "plan" && styles.segmentBtnActive]}
        onPress={() => setView("plan")}
        testID="planner-view-plan"
      >
        <Calendar size={16} color={view === "plan" ? Colors.white : Colors.textLight} />
        <Text style={[styles.segmentText, view === "plan" && styles.segmentTextActive]}>
          {t("planView")}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.segmentBtn, view === "shopping" && styles.segmentBtnActive]}
        onPress={() => setView("shopping")}
        testID="planner-view-shopping"
      >
        <ShoppingCart size={16} color={view === "shopping" ? Colors.white : Colors.textLight} />
        <Text style={[styles.segmentText, view === "shopping" && styles.segmentTextActive]}>
          {t("shoppingView")}
        </Text>
      </Pressable>
    </View>
  );

  // ---- Plan view ----

  const weekBar = (
    <View style={styles.weekBar}>
      <Pressable onPress={() => setMonday((m) => addWeeks(m, -1))} hitSlop={10} testID="planner-week-prev">
        <ChevronLeft size={22} color={Colors.text} />
      </Pressable>
      <Pressable onPress={() => setMonday(thisMondayIso())} testID="planner-week-today">
        <Text style={styles.weekRange}>{formatWeekRange(monday, currentLanguage)}</Text>
      </Pressable>
      <Pressable onPress={() => setMonday((m) => addWeeks(m, 1))} hitSlop={10} testID="planner-week-next">
        <ChevronRight size={22} color={Colors.text} />
      </Pressable>
    </View>
  );

  const renderDay = ({ item: day }: { item: string }) => {
    const dayEntries: PlanEntry[] = entriesByDay[day] ?? [];
    return (
      <View style={styles.daySection}>
        <Text style={[styles.dayHeader, isTodayIso(day) && styles.dayHeaderToday]}>
          {formatDayLabel(day, currentLanguage)}
          {isTodayIso(day) ? ` · ${t("today")}` : ""}
        </Text>
        {dayEntries.length === 0 ? (
          <Text style={styles.emptyDay}>{t("emptyDayHint")}</Text>
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
                  {cooked && <Check size={14} color={Colors.white} />}
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
                    <Text style={[styles.mealName, cooked && styles.mealNameCooked]} numberOfLines={2}>
                      {r.name}
                    </Text>
                    <Text style={styles.mealServings}>
                      {entry.servings} {t("portions")}
                    </Text>
                  </View>
                </Pressable>
                {cooked ? (
                  <View style={styles.mealRemove}>
                    <Check size={18} color={Colors.success} />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => removeFromPlan(entry.id)}
                    hitSlop={10}
                    style={styles.mealRemove}
                    testID={`planner-meal-remove-${entry.id}`}
                  >
                    <X size={18} color={Colors.textLight} />
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
            <Text style={styles.shopRecipeName} numberOfLines={2}>
              {recipe.name}
            </Text>
            <View style={styles.shopHeadMeta}>
              <Text style={styles.shopDate}>{formatDayLabel(item.day, currentLanguage)}</Text>
              <View style={styles.miniStepper}>
                <Pressable
                  onPress={() => setServings(entry.id, clampServings(entry.servings - 1))}
                  hitSlop={6}
                  style={styles.miniStepBtn}
                  testID={`shop-servings-minus-${entry.id}`}
                >
                  <Minus size={13} color={Colors.primary} />
                </Pressable>
                <Text style={styles.miniStepValue}>{entry.servings}</Text>
                <Pressable
                  onPress={() => setServings(entry.id, clampServings(entry.servings + 1))}
                  hitSlop={6}
                  style={styles.miniStepBtn}
                  testID={`shop-servings-plus-${entry.id}`}
                >
                  <Plus size={13} color={Colors.primary} />
                </Pressable>
                <Text style={styles.miniStepUnit}>{t("portions")}</Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => setCooked(entry.id, true)}
            hitSlop={8}
            style={[styles.recipeCheck, allChecked && styles.recipeCheckReady]}
            testID={`shop-recipe-done-${entry.id}`}
            accessibilityLabel={t("checkOffRecipe")}
          >
            <Check size={18} color={allChecked ? Colors.white : Colors.textLight} />
          </Pressable>
        </View>

        <View style={styles.shopLines}>
          {item.lines.map((line) => (
            <Pressable
              key={line.id}
              style={styles.shopLine}
              onPress={() => toggleIngredient(entry.id, line.id)}
              testID={`shop-line-${entry.id}-${line.id}`}
            >
              <View style={[styles.bullet, line.checked && styles.bulletChecked]}>
                {line.checked && <Check size={12} color={Colors.white} />}
              </View>
              <Text style={[styles.lineName, line.checked && styles.lineChecked]} numberOfLines={2}>
                {line.name}
              </Text>
              {!!line.amount && (
                <Text style={[styles.lineAmount, line.checked && styles.lineChecked]}>{line.amount}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  const shoppingListEl = (
    <FlatList
      ref={listRef}
      data={shopSections}
      keyExtractor={(s) => s.entry.id}
      renderItem={renderSection}
      ListEmptyComponent={<Text style={styles.emptyList}>{t("noPlannedMeals")}</Text>}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
  segment: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.cardSecondary,
  },
  segmentBtnActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 14, fontWeight: "700", color: Colors.textLight },
  segmentTextActive: { color: Colors.white },
  listContent: { padding: 16, paddingBottom: 48 },
  weekBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  weekRange: { fontSize: 16, fontWeight: "700", color: Colors.text },

  // Plan view
  daySection: { marginBottom: 18 },
  dayHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dayHeaderToday: { color: Colors.primary },
  emptyDay: { fontSize: 14, color: Colors.textLight, fontStyle: "italic" },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardSecondary,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    gap: 8,
  },
  mealRowCooked: { backgroundColor: "#E9F7EF" },
  cookToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cookToggleOn: { backgroundColor: Colors.success, borderColor: Colors.success },
  mealMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  mealThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.border },
  mealThumbFallback: { backgroundColor: Colors.border },
  mealTextWrap: { flex: 1 },
  mealName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  mealNameCooked: { textDecorationLine: "line-through", color: Colors.textLight },
  mealServings: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  mealRemove: { padding: 8 },

  // Shopping view
  shopCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  shopCardHead: { flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "flex-start" },
  recipeCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeCheckReady: { backgroundColor: Colors.success, borderColor: Colors.success },
  shopThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: Colors.border },
  shopHeadText: { flex: 1 },
  shopRecipeName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  shopHeadMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  shopDate: { fontSize: 13, color: Colors.textLight, flexShrink: 1 },
  miniStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cardSecondary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniStepBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStepValue: { fontSize: 14, fontWeight: "700", color: Colors.text, minWidth: 16, textAlign: "center" },
  miniStepUnit: { fontSize: 12, color: Colors.textLight },
  shopLines: { gap: 2 },
  shopLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  bullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletChecked: { backgroundColor: Colors.success, borderColor: Colors.success },
  lineName: { flex: 1, fontSize: 15, color: Colors.text },
  lineAmount: { fontSize: 14, color: Colors.textLight, marginLeft: 8 },
  lineChecked: { textDecorationLine: "line-through", color: Colors.textLight },

  emptyList: { textAlign: "center", color: Colors.textLight, marginTop: 32, fontSize: 15 },
});
