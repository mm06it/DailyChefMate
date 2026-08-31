import { Check, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
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
}

// Shared day picker for "add this recipe to the week plan" — used from the
// recipe card and the recipe detail screen.
export default function AddToPlanModal({ recipe, visible, onClose }: AddToPlanModalProps) {
  const { t, currentLanguage } = useLanguage();
  const { addToPlan, entriesByDay } = useMealPlan();
  const [monday, setMonday] = useState<string>(thisMondayIso());
  const [addedDay, setAddedDay] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMonday(thisMondayIso());
      setAddedDay(null);
    }
  }, [visible]);

  if (!recipe) return null;

  const days = weekDates(monday);

  const handlePick = (iso: string) => {
    addToPlan(recipe, iso);
    setAddedDay(iso);
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

          <View style={styles.weekBar}>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, -1))} hitSlop={10} testID="add-to-plan-prev">
              <ChevronLeft size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.weekRange}>{formatWeekRange(monday, currentLanguage)}</Text>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, 1))} hitSlop={10} testID="add-to-plan-next">
              <ChevronRight size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View style={styles.dayList}>
            {days.map((iso) => {
              const count = entriesByDay[iso]?.length ?? 0;
              const justAdded = addedDay === iso;
              return (
                <Pressable
                  key={iso}
                  style={[styles.dayRow, isTodayIso(iso) && styles.dayRowToday]}
                  onPress={() => handlePick(iso)}
                  testID={`add-to-plan-day-${iso}`}
                >
                  <Text style={styles.dayLabel}>{formatDayLabel(iso, currentLanguage)}</Text>
                  <View style={styles.dayRight}>
                    {count > 0 && <Text style={styles.dayCount}>{count}</Text>}
                    {justAdded && <Check size={18} color={Colors.success} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
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
    marginBottom: 16,
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
  dayList: {
    gap: 6,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardSecondary,
  },
  dayRowToday: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  dayRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayCount: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textLight,
    minWidth: 18,
    textAlign: "center",
  },
});
