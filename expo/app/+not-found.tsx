import { Link, Stack } from "expo-router";
import { StyleSheet, Text as RNText, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useLanguage } from "@/hooks/use-language";
import { Text } from "@/components/ui/Text";

export default function NotFoundScreen() {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: t('oops') }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <RNText style={styles.emoji} accessibilityElementsHidden>
            🍳
          </RNText>
          <Text variant="label" color="accent" style={styles.brand}>
            DailyChefMate
          </Text>
          <Text variant="h2" center style={styles.title}>
            {t('oops')}
          </Text>
          <Text variant="body" color="secondary" center style={styles.body}>
            {t('screenNotFound')}
          </Text>
          <Link href="/" style={styles.button}>
            <RNText style={styles.buttonText}>{t('goHome')}</RNText>
          </Link>
        </View>
      </View>
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: t.space[7],
      backgroundColor: t.bg,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      alignItems: "center",
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.xl,
      paddingVertical: t.space[10],
      paddingHorizontal: t.space[8],
      ...t.elevation.md,
    },
    emoji: { fontSize: 48 },
    brand: { marginTop: t.space[3] },
    title: { marginTop: t.space[5] },
    body: { marginTop: t.space[3] },
    button: {
      marginTop: t.space[7],
      paddingVertical: 13,
      paddingHorizontal: 26,
      borderRadius: t.radius.md,
      backgroundColor: t.accent,
    },
    buttonText: {
      color: t.textOnAccent,
      fontFamily: t.font.bodySemibold,
      fontSize: 14,
    },
  });
