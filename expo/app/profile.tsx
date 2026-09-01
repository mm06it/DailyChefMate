import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useLanguage } from '@/hooks/use-language';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import ProfileContent from '@/components/ProfileContent';

export default function ProfileScreen() {
  const { t } = useLanguage();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: t('profile') }} />
      <ResponsiveContainer maxWidth={720}>
        <ProfileContent />
      </ResponsiveContainer>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bgSubtle },
    contentContainer: { padding: t.space[6] },
  });
