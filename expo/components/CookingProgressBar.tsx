import { router, usePathname, useGlobalSearchParams } from "expo-router";
import { Check, ChefHat, ChevronRight, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Theme } from "@/constants/theme";
import { getTranslation } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useCookingSession } from "@/hooks/use-cooking-session";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useIsDesktop } from "@/hooks/use-responsive";
import { useToast } from "@/components/Toast";
import { Text } from "@/components/ui/Text";

// Persistent top-of-screen bar showing the current step of an in-progress
// cooking session. Mounted once at the app root. Hidden while you're already
// looking at that recipe's cooking view.
export default function CookingProgressBar() {
  const { session, hydrated, advance, stop } = useCookingSession();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const { currentLanguage } = useLanguage();
  const { markRecipeAsCooked } = useDailyChefMateStore();
  const { markPlannedCooked } = useMealPlan();
  const { showToast } = useToast();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ id?: string }>();

  const [confirmClose, setConfirmClose] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  if (!hydrated || !session) return null;

  // Don't shadow the cooking view of the very recipe we're tracking.
  const onOwnRecipe = pathname.includes("/recipe-detail") && params.id === session.recipeId;
  if (onOwnRecipe) return null;

  const t = (k: string) => getTranslation(currentLanguage, k);
  const total = session.steps.length;
  const firstOpen = session.completed.findIndex((c) => !c);
  const allDone = firstOpen === -1;
  const idx = allDone ? total - 1 : firstOpen;
  const remaining = session.completed.filter((c) => !c).length;
  const onLast = remaining <= 1;

  const openRecipe = () =>
    router.push(`/recipe-detail?id=${session.recipeId}&step=${idx}`);

  const finish = () => {
    const rid = session.recipeId;
    markRecipeAsCooked(rid);
    markPlannedCooked(rid);
    stop();
    showToast(t("recipeCookedToast"), { icon: "check", variant: "success" });
    router.push(`/recipe-detail?id=${rid}`);
  };

  const handleNext = () => {
    const wasLast = advance();
    if (wasLast || onLast) finish();
  };

  const handleClose = () => {
    if (!confirmClose) {
      setConfirmClose(true);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => setConfirmClose(false), 3000);
      return;
    }
    if (closeTimer.current) clearTimeout(closeTimer.current);
    stop();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          left: (isDesktop ? theme.layout.sidebarWidth : 0) + 12,
          bottom: insets.bottom + (isDesktop ? 12 : theme.layout.tabBarHeight + 8),
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.headRow}>
          <ChefHat size={14} color={theme.accent} />
          <Text variant="caption" color="secondary" numberOfLines={1} style={styles.headName}>
            {session.recipeName}
          </Text>
          <Text variant="caption" color="muted">
            {idx + 1}/{total}
          </Text>
          <Pressable onPress={handleClose} hitSlop={8} testID="cooking-bar-close" style={styles.closeBtn}>
            {confirmClose ? (
              <Text variant="caption" color="danger">{t("cancelCooking")}</Text>
            ) : (
              <X size={16} color={theme.textMuted} />
            )}
          </Pressable>
        </View>

        <Pressable onPress={openRecipe} testID="cooking-bar-open" style={styles.stepPress}>
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollInner}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="body" style={styles.stepText}>
              {allDone ? t("cookingFinish") : session.steps[idx]}
            </Text>
          </ScrollView>
          <ChevronRight size={18} color={theme.textMuted} />
        </Pressable>

        <Pressable
          onPress={handleNext}
          style={styles.nextBtn}
          testID="cooking-bar-next"
        >
          {onLast ? (
            <Check size={16} color={theme.textOnAccent} />
          ) : null}
          <Text variant="label" style={styles.nextText}>
            {onLast ? t("cookingFinish") : t("cookingNextStep")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      right: 12,
      alignItems: "flex-start",
      zIndex: 50,
    },
    card: {
      width: "100%",
      maxWidth: 240,
      backgroundColor: t.surfaceRaised,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      padding: t.space[3],
      gap: t.space[2],
      ...t.elevation.lg,
    },
    headRow: { flexDirection: "row", alignItems: "center", gap: t.space[2] },
    headName: { flex: 1 },
    closeBtn: { paddingLeft: t.space[2] },
    stepPress: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[2],
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[3],
    },
    stepScroll: { flex: 1, maxHeight: 160 },
    stepScrollInner: { flexGrow: 1 },
    stepText: { color: t.textPrimary },
    nextBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[2],
      backgroundColor: t.success,
      borderRadius: t.radius.md,
      paddingVertical: t.space[3],
    },
    nextText: { color: t.textOnAccent, fontFamily: t.font.bodySemibold },
  });
