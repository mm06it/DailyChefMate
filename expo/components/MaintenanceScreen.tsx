import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

// Shown instead of the endless loading spinner when the app shell has loaded
// but the backend (Convex) can't be reached — see app/_layout.tsx.
export default function MaintenanceScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <RNText style={styles.emoji} accessibilityElementsHidden>
          🍳
        </RNText>
        <Text variant="label" color="accent" style={styles.brand}>
          DailyChefMate
        </Text>
        <Text variant="h2" center style={styles.title}>
          {t('maintenanceTitle')}
        </Text>
        <Text variant="body" color="secondary" center style={styles.body}>
          {t('maintenanceBody')}
        </Text>
        <Button label={t('retry')} onPress={onRetry} testID="maintenance-retry" style={styles.button} />
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: t.space[7],
      backgroundColor: t.bg,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
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
    button: { marginTop: t.space[7] },
  });
