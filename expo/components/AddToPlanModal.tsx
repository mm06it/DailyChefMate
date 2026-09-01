import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { translateText } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useToast } from "@/components/Toast";
import { Text } from "@/components/ui/Text";
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

export default function AddToPlanModal({ recipe, visible, onClose, onAdded }: AddToPlanModalProps) {
  const { t, currentLanguage } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="h3">{t("pickDay")}</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="add-to-plan-close">
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Text variant="bodySm" color="secondary" numberOfLines={1} style={styles.recipeName}>
            {recipe.name}
          </Text>

          <View style={styles.servingsRow}>
            <Text variant="title">{t("portions")}</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, servings <= MIN_SERVINGS && styles.stepBtnDisabled]}
                onPress={() => setServings((s) => Math.max(MIN_SERVINGS, s - 1))}
                disabled={servings <= MIN_SERVINGS}
                testID="add-to-plan-servings-minus"
              >
                <Minus size={16} color={servings <= MIN_SERVINGS ? theme.textMuted : theme.accent} />
              </Pressable>
              <Text variant="title" style={styles.stepValue}>{servings}</Text>
              <Pressable
                style={[styles.stepBtn, servings >= MAX_SERVINGS && styles.stepBtnDisabled]}
                onPress={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
                disabled={servings >= MAX_SERVINGS}
                testID="add-to-plan-servings-plus"
              >
                <Plus size={16} color={servings >= MAX_SERVINGS ? theme.textMuted : theme.accent} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekBar}>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, -1))} hitSlop={10} testID="add-to-plan-prev">
              <ChevronLeft size={22} color={theme.textPrimary} />
            </Pressable>
            <Text variant="title">{formatWeekRange(monday, currentLanguage)}</Text>
            <Pressable onPress={() => setMonday((m) => addWeeks(m, 1))} hitSlop={10} testID="add-to-plan-next">
              <ChevronRight size={22} color={theme.textPrimary} />
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
                    <Text variant="title">{formatDayLabel(iso, currentLanguage)}</Text>
                    {justAdded && <Check size={18} color={theme.success} />}
                  </View>
                  {dayEntries.length > 0 && (
                    <View style={styles.plannedList}>
                      {dayEntries.map((e) => (
                        <Text key={e.id} variant="bodySm" color="secondary" numberOfLines={1}>
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: t.overlay },
    sheet: {
      backgroundColor: t.surfaceRaised,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      padding: t.space[6],
      paddingBottom: t.space[9],
      maxHeight: "85%",
      ...t.elevation.lg,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recipeName: { marginTop: 2 },
    servingsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: t.space[4],
      marginBottom: t.space[2],
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[4],
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[1],
    },
    stepBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBtnDisabled: { opacity: 0.5 },
    stepValue: { minWidth: 20, textAlign: "center" },
    weekBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: t.space[3],
      marginBottom: t.space[3],
    },
    dayScroll: { flexGrow: 0 },
    dayRow: {
      paddingVertical: t.space[4],
      paddingHorizontal: t.space[4],
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      marginBottom: t.space[2],
    },
    dayRowToday: { borderWidth: t.borderWidth.hairline, borderColor: t.accent },
    dayRowHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    plannedList: { marginTop: t.space[2], gap: 2 },
  });
