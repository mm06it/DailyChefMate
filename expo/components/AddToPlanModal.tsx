import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { translateText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useToast } from "@/components/Toast";
import { Recipe } from "@/types/recipe";
import {
  addWeeks,
  formatDayLabel,
  formatWeekRange,
  isTodayIso,
  thisMondayIso,
  weekDates,
} from "@/lib/week";

interface AddToPlanModalProps {
  recipe: Recipe | null;
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

// Shared day picker for "add this recipe to the week plan" — used from the
// recipe card and the recipe detail screen.
export default function AddToPlanModal({ recipe, visible, onClose, onAdded }: AddToPlanModalProps) {
  const { t, currentLanguage } = useLanguage();
  const { addToPlan, entriesByDay } = useMealPlan();
  const { showToast } = useToast();
  const [monday, setMonday] = useState<string>(thisMondayIso());
  const [addedDay, setAddedDay] = useState<string | null>(null);
  const [servings, setServings] = useState<number>(2);

  useEffect(() => {
    if (visible) {
      setMonday(thisMondayIso());
      setAddedDay(null);
      setServings(recipe?.servings && recipe.servings > 0 ? recipe.servings : 2);
    }
  }, [visible, recipe]);

  if (!recipe) return null;

  const days = weekDates(monday);

  const handlePick = (iso: string) => {
    addToPlan(recipe, iso, servings);
    setAddedDay(iso);
    onAdded?.();
    showToast(t("addedToWeekPlan"), { icon: "calendar" });
    setTimeout(onClose, 550);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("pickDay")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="add-to-plan-close">
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          <Text style={styles.recipeName} numberOfLines={1}>
            {recipe.name}
          </Text>

          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>{t("portions")}</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, servings <= MIN_SERVINGS && styles.stepBtnDisabled]}
                onPress={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
                disabled={servings <= MIN_SERVINGS}
                testID="add-to-plan-servings-minus"
              >
                <Minus size={16} color={servings <= MIN_SERVINGS ? Colors.textLight : Colors.primary} />
              </Pressable>
              <Text style={styles.stepValue}>{servings}</Text>
              <Pressable
                style={[styles.stepBtn, servings >= MAX_SERVINGS && styles.stepBtnDisabled]}
                onPress={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
                disabled={servings >= MAX_SERVINGS}
                testID="add-to-plan-servings-plus"
              >
                <Plus size={16} color={servings >= MAX_SERVINGS ? Colors.textLight : Colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekBar}>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, -1))} hitSlop={10} testID="add-to-plan-prev">
              <ChevronLeft size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.weekRange}>{formatWeekRange(monday, currentLanguage)}</Text>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, 1))} hitSlop={10} testID="add-to-plan-next">
              <ChevronRight size={22} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.dayScroll} showsVerticalScrollIndicator={false}>
            {days.map((iso) => {
              const dayEntries = entriesByDay[iso] ?? [];
              const justAdded = addedDay === iso;
              return (
                <Pressable
                  key={iso}
                  style={[styles.dayRow, isTodayIso(iso) && styles.dayRowToday]}
                  onPress={() => handlePick(iso)}
                  testID={`add-to-plan-day-${iso}`}
                >
                  <View style={styles.dayRowHead}>
                    <Text style={styles.dayLabel}>{formatDayLabel(iso, currentLanguage)}</Text>
                    {justAdded && <Check size={18} color={Colors.success} />}
                  </View>
                  {dayEntries.length > 0 && (
                    <View style={styles.plannedList}>
                      {dayEntries.map((e) => (
                        <Text key={e.id} style={styles.plannedItem} numberOfLines={1}>
                          • {translateText(currentLanguage, e.recipe.name) || e.recipe.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  recipeName: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  servingsLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.cardSecondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnDisabled: {
    opacity: 0.5,
  },
  stepValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    minWidth: 20,
    textAlign: "center",
  },
  weekBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  weekRange: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  dayScroll: {
    flexGrow: 0,
  },
  dayRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardSecondary,
    marginBottom: 6,
  },
  dayRowToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayRowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  plannedList: {
    marginTop: 6,
    gap: 2,
  },
  plannedItem: {
    fontSize: 13,
    color: Colors.textLight,
  },
});
