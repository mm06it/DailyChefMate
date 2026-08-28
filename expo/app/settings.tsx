import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Globe, Info, Pencil } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useMutation } from 'convex/react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Colors from '@/constants/colors';
import { api } from '@/convex/_generated/api';

// Mirror of convex/users.ts's USERNAME_PATTERN so an obviously bad value is
// rejected before the round trip.
const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const updateUsername = useMutation(api.users.updateUsername);

  const currentUsername = user?.username ?? '';

  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

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

  const startEditing = useCallback(() => {
    setDraft(currentUsername);
    setEditing(true);
  }, [currentUsername]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft('');
  }, []);

  const saveUsername = useCallback(async () => {
    const next = draft.trim().toLowerCase();
    if (next === currentUsername) {
      cancelEditing();
      return;
    }
    if (!USERNAME_PATTERN.test(next)) {
      Alert.alert(t('usernameInvalid'));
      return;
    }
    setSaving(true);
    try {
      await updateUsername({ username: next });
      setEditing(false);
      setDraft('');
      Alert.alert(t('usernameUpdated'));
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('USERNAME_TAKEN')) {
        Alert.alert(t('usernameTaken'));
      } else if (message.includes('INVALID_USERNAME')) {
        Alert.alert(t('usernameInvalid'));
      } else {
        Alert.alert(t('usernameUpdateFailed'));
      }
    } finally {
      setSaving(false);
    }
  }, [draft, currentUsername, cancelEditing, updateUsername, t]);

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

          <View style={[styles.settingItem, editing && styles.settingItemColumn]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <User size={20} color={Colors.textLight} />
                <Text style={styles.settingLabel}>Username</Text>
              </View>
              {editing ? (
                <TextInput
                  style={styles.usernameInput}
                  value={draft}
                  onChangeText={setDraft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  maxLength={20}
                  editable={!saving}
                  placeholder="username"
                  placeholderTextColor={Colors.textLight}
                  testID="settings-username-input"
                />
              ) : (
                <TouchableOpacity
                  style={styles.settingValueRow}
                  onPress={startEditing}
                  testID="settings-username-edit"
                >
                  <Text style={styles.settingValue}>{currentUsername || '-'}</Text>
                  <Pencil size={16} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {editing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={cancelEditing}
                  disabled={saving}
                  testID="settings-username-cancel"
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={saveUsername}
                  disabled={saving}
                  testID="settings-username-save"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  settingItemColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  settingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'right',
    paddingVertical: 0,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  cancelButton: {
    backgroundColor: Colors.cardSecondary,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
