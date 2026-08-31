import { useScrollToTop } from "@react-navigation/native";
import { router, useFocusEffect } from "expo-router";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import { useMealPlan, type PlanEntry, type ShoppingItem } from "@/hooks/use-meal-plan";
import { useIsDesktop } from "@/hooks/use-responsive";
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

export default function PlannerScreen() {
  const { t, currentLanguage } = useLanguage();
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const listRef = useRef<FlatList<any>>(null);
  useScrollToTop(listRef);
  useFocusEffect(useCallback(() => resetHeader(), []));

  const [view, setView] = useState<PlannerView>("plan");
  const [monday, setMonday] = useState<string>(thisMondayIso());
  const [newItem, setNewItem] = useState<string>("");
  const [fillNote, setFillNote] = useState<string>("");

  const {
    entriesByDay,
    entries,
    shoppingList,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    removeFromPlan,
    clearChecked,
    clearShoppingList,
    buildShoppingListFromWeek,
  } = useMealPlan();

  const days = useMemo(() => weekDates(monday), [monday]);

  // Localize the snapshotted recipe names/categories the same way the rest of
  // the app does, then look them up by id when rendering the plan.
  const weekRecipes = useMemo(() => {
    const seen = new Map<string, Recipe>();
    for (const e of entries) {
      if (days.includes(e.day) && !seen.has(e.recipe.id)) seen.set(e.recipe.id, e.recipe);
    }
    return [...seen.values()];
  }, [entries, days]);
  const localized = useLocalizedRecipes(weekRecipes);
  const localizedById = useMemo(() => {
    const m = new Map<string, Recipe>();
    for (const r of localized) m.set(r.id, r);
    return m;
  }, [localized]);

  const handleFill = async () => {
    const added = await buildShoppingListFromWeek(days);
    setFillNote(added > 0 ? `${added} ${t("itemsAddedSuffix")}` : t("nothingNewAdded"));
    setTimeout(() => setFillNote(""), 2500);
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    addShoppingItem(newItem);
    setNewItem("");
  };

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
            return (
              <View key={entry.id} style={styles.mealRow}>
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
                  <Text style={styles.mealName} numberOfLines={2}>
                    {r.name}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeFromPlan(entry.id)}
                  hitSlop={10}
                  style={styles.mealRemove}
                  testID={`planner-meal-remove-${entry.id}`}
                >
                  <X size={18} color={Colors.textLight} />
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    );
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => (
    <View style={styles.shopRow}>
      <Pressable
        onPress={() => toggleShoppingItem(item.id)}
        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
        hitSlop={8}
        testID={`shop-check-${item.id}`}
      >
        {item.checked && <Check size={14} color={Colors.white} />}
      </Pressable>
      <View style={styles.shopTextWrap}>
        <Text style={[styles.shopName, item.checked && styles.shopNameChecked]} numberOfLines={2}>
          {item.name}
        </Text>
        {!!item.amount && <Text style={styles.shopAmount}>{item.amount}</Text>}
      </View>
      <Pressable
        onPress={() => removeShoppingItem(item.id)}
        hitSlop={10}
        testID={`shop-remove-${item.id}`}
      >
        <X size={18} color={Colors.textLight} />
      </Pressable>
    </View>
  );

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

  const shoppingHeader = (
    <View>
      <View style={styles.addItemRow}>
        <TextInput
          style={styles.addItemInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder={t("itemNamePlaceholder")}
          placeholderTextColor={Colors.textLight}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
          testID="shop-add-input"
        />
        <Pressable onPress={handleAddItem} style={styles.addItemBtn} testID="shop-add-btn">
          <Plus size={22} color={Colors.white} />
        </Pressable>
      </View>
      <View style={styles.shopActions}>
        <Pressable onPress={handleFill} style={styles.shopActionBtn} testID="shop-fill-btn">
          <Text style={styles.shopActionText}>{t("fillFromPlan")}</Text>
        </Pressable>
        <Pressable onPress={clearChecked} style={styles.shopActionBtn} testID="shop-clear-checked">
          <Text style={styles.shopActionText}>{t("removeChecked")}</Text>
        </Pressable>
        <Pressable onPress={clearShoppingList} style={styles.shopActionBtn} testID="shop-clear-all">
          <Text style={styles.shopActionText}>{t("clearList")}</Text>
        </Pressable>
      </View>
      {!!fillNote && <Text style={styles.fillNote}>{fillNote}</Text>}
    </View>
  );

  const shoppingListEl = (
    <FlatList
      ref={listRef}
      data={shoppingList}
      keyExtractor={(i) => i.id}
      renderItem={renderShoppingItem}
      ListHeaderComponent={shoppingHeader}
      ListEmptyComponent={<Text style={styles.emptyList}>{t("shoppingListEmpty")}</Text>}
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
  },
  mealMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  mealThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.border },
  mealThumbFallback: { backgroundColor: Colors.border },
  mealName: { flex: 1, fontSize: 15, fontWeight: "600", color: Colors.text },
  mealRemove: { padding: 8 },
  addItemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  addItemBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 10,
  },
  shopActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  shopActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  shopActionText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  fillNote: { marginTop: 8, fontSize: 13, fontWeight: "600", color: Colors.success },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textLight,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.success, borderColor: Colors.success },
  shopTextWrap: { flex: 1 },
  shopName: { fontSize: 15, color: Colors.text },
  shopNameChecked: { textDecorationLine: "line-through", color: Colors.textLight },
  shopAmount: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  emptyList: { textAlign: "center", color: Colors.textLight, marginTop: 32, fontSize: 15 },
});
