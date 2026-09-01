import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/use-language';

// Shown instead of the endless loading spinner when the app shell has loaded
// but the backend (Convex) can't be reached — see app/_layout.tsx.
export default function MaintenanceScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji} accessibilityElementsHidden>
          🍳
        </Text>
        <Text style={styles.brand}>DailyChefMate</Text>
        <Text style={styles.title}>{t('maintenanceTitle')}</Text>
        <Text style={styles.body}>{t('maintenanceBody')}</Text>
        <Pressable style={styles.button} onPress={onRetry} testID="maintenance-retry">
          <Text style={styles.buttonText}>{t('retry')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  emoji: {
    fontSize: 48,
  },
  brand: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textLight,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
