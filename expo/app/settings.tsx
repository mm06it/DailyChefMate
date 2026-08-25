import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Globe, Info } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Colors from '@/constants/colors';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('signOutConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const username = useMemo(() => (user?.user_metadata as any)?.username ?? '-', [user]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: t('settings'),
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <ResponsiveContainer maxWidth={640}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>Username</Text>
            </View>
            <Text style={styles.settingValue}>{username}</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>Email</Text>
            </View>
            <Text style={styles.settingValue}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('preferences')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Globe size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('language')}</Text>
            </View>
            <LanguageSelector />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Info size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('version')}</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.textLight,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginTop: 32,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});