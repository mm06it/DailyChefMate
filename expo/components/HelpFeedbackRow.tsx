import { router } from "expo-router";
import { ChevronRight, LifeBuoy } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { Theme } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

// Quiet "Help & feedback" entry point — opens the support message form (the
// admin profile's contact view). Renders nothing when no support account is
// configured for the deployment.
export default function HelpFeedbackRow({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { myProfile } = useSocial();
  const adminId = myProfile?.adminId ?? null;
  if (!adminId) return null;

  return (
    <Pressable
      style={[styles.row, style]}
      onPress={() => router.push(`/user/${adminId}` as any)}
      testID="help-feedback"
    >
      <LifeBuoy size={20} color={theme.textMuted} />
      <View style={styles.textWrap}>
        <Text variant="body">{t("helpAndFeedback")}</Text>
        <Text variant="bodySm" color="muted" style={styles.sub}>
          {t("helpAndFeedbackSub")}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      paddingVertical: t.space[4],
      paddingHorizontal: t.space[4],
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
    },
    textWrap: { flex: 1 },
    sub: { marginTop: 2 },
  });
