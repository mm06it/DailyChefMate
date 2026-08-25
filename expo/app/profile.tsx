import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

import Colors from '@/constants/colors';
import { useLanguage } from '@/hooks/use-language';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import ProfileContent from '@/components/ProfileContent';

export default function ProfileScreen() {
  const { t } = useLanguage();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: t('profile') }} />
      <ResponsiveContainer maxWidth={720}>
        <ProfileContent />
      </ResponsiveContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
  },
});
