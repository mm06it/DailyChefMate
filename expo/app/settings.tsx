import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Globe, Info, Pencil, Users, Eye, Smile } from 'lucide-react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useConvex, useMutation } from 'convex/react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useSocial } from '@/hooks/use-social';
import { useIsDesktop } from '@/hooks/use-responsive';
import InlineConfirm from '@/components/InlineConfirm';
import CollapsingTabHeader, {
  resetHeader,
  useHeaderContentPadding,
} from '@/components/CollapsingTabHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Avatar from '@/components/Avatar';
import Colors from '@/constants/colors';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '@/constants/avatar';
import { api } from '@/convex/_generated/api';

// Mirror of convex/users.ts's USERNAME_PATTERN so an obviously bad value is
// rejected before the round trip.
const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

type Feedback = { type: 'error' | 'success'; text: string } | null;

export default function SettingsScreen() {
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  useFocusEffect(useCallback(() => resetHeader(), []));

  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const convex = useConvex();
  const updateUsername = useMutation(api.users.updateUsername);
  const { myProfile, setSocialProfile } = useSocial();

  const currentUsername = user?.username ?? '';

  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState<boolean>(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displayNameDraft, setDisplayNameDraft] = useState<string>('');
  const displayNameSeeded = useRef<boolean>(false);
  useEffect(() => {
    if (!displayNameSeeded.current && myProfile) {
      setDisplayNameDraft(myProfile.displayName ?? '');
      displayNameSeeded.current = true;
    }
  }, [myProfile]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleSignOut = async () => {
    setConfirmingSignOut(false);
    await signOut();
  };

  const startEditing = useCallback(() => {
    setDraft(currentUsername);
    setFeedback(null);
    setEditing(true);
  }, [currentUsername]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft('');
    setFeedback(null);
  }, []);

  const saveUsername = useCallback(async () => {
    const next = draft.trim().toLowerCase();

    if (next.length === 0 || !USERNAME_PATTERN.test(next)) {
      setFeedback({ type: 'error', text: t('usernameInvalid') });
      return;
    }
    if (next === currentUsername) {
      cancelEditing();
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      // Convex Auth's prod deployment redacts the mutation's error text, so
      // check availability up front to give a precise "taken" message.
      const available = await convex.mutation(api.users.usernameAvailable, { username: next });
      if (available === false) {
        setFeedback({ type: 'error', text: t('usernameTaken') });
        return;
      }

      await updateUsername({ username: next });
      setEditing(false);
      setDraft('');
      setFeedback({ type: 'success', text: t('usernameUpdated') });
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes('INVALID_USERNAME')) {
        setFeedback({ type: 'error', text: t('usernameInvalid') });
      } else if (message.includes('USERNAME_TAKEN')) {
        setFeedback({ type: 'error', text: t('usernameTaken') });
      } else {
        // Prod hides the real reason ("Server Error"). Re-check availability
        // so a race that grabbed the name still shows "taken", not a generic
        // failure.
        const stillFree = await convex
          .mutation(api.users.usernameAvailable, { username: next })
          .catch(() => null);
        if (stillFree === false) {
          setFeedback({ type: 'error', text: t('usernameTaken') });
        } else {
          console.error('updateUsername failed', e);
          setFeedback({ type: 'error', text: t('usernameUpdateFailed') });
        }
      }
    } finally {
      setSaving(false);
    }
  }, [draft, currentUsername, cancelEditing, convex, updateUsername, t]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: t('settings'),
          headerShown: isDesktop,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      {/* Settings keeps the header pinned — no hide-on-scroll here. */}
      {!isDesktop && <CollapsingTabHeader showBack />}
      <ScrollView
        contentContainerStyle={[styles.content, !isDesktop && { paddingTop: topPad + 20 }]}
      >
        <ResponsiveContainer maxWidth={640}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>

          <View style={[styles.settingItem, styles.settingItemColumn]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <User size={20} color={Colors.textLight} />
                <Text style={styles.settingLabel}>{t('username')}</Text>
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
                  onSubmitEditing={saveUsername}
                  returnKeyType="done"
                  placeholder={t('username')}
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

            {feedback && (
              <Text
                style={[
                  styles.feedbackText,
                  feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
                ]}
                testID="settings-username-feedback"
              >
                {feedback.text}
              </Text>
            )}
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('email')}</Text>
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
          <Text style={styles.sectionTitle}>{t('socialProfile')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <User size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('displayName')}</Text>
            </View>
            <TextInput
              style={styles.usernameInput}
              value={displayNameDraft}
              onChangeText={setDisplayNameDraft}
              maxLength={40}
              placeholder={user?.username ?? ''}
              placeholderTextColor={Colors.textLight}
              onEndEditing={() => setSocialProfile({ displayName: displayNameDraft.trim() })}
              returnKeyType="done"
              testID="settings-displayname-input"
            />
          </View>

          <View style={styles.avatarBlock}>
            <View style={styles.settingLeft}>
              <Smile size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('avatar')}</Text>
            </View>

            <View style={styles.avatarPreviewWrap}>
              <Avatar
                size={64}
                name={displayNameDraft || currentUsername || '?'}
                initials={myProfile?.initials}
                color={myProfile?.avatarColor ?? undefined}
                emoji={myProfile?.avatarEmoji ?? undefined}
              />
            </View>

            <Text style={styles.avatarSubLabel}>{t('avatarSymbol')}</Text>
            <View style={styles.avatarGrid}>
              <Pressable
                style={[styles.emojiChip, !myProfile?.avatarEmoji && styles.emojiChipActive]}
                onPress={() => setSocialProfile({ avatarEmoji: '' })}
                testID="avatar-emoji-initials"
              >
                <Text style={styles.emojiChipAa}>{t('avatarInitialsOption')}</Text>
              </Pressable>
              {AVATAR_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiChip, myProfile?.avatarEmoji === e && styles.emojiChipActive]}
                  onPress={() => setSocialProfile({ avatarEmoji: e })}
                  testID={`avatar-emoji-${e}`}
                >
                  <Text style={styles.emojiChipText}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.avatarSubLabel}>{t('avatarBackground')}</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    myProfile?.avatarColor === c && styles.swatchActive,
                  ]}
                  onPress={() => setSocialProfile({ avatarColor: c })}
                  testID={`avatar-color-${c}`}
                />
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Users size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('discoverable')}</Text>
            </View>
            <Switch
              value={myProfile ? myProfile.discoverable : true}
              onValueChange={(val) => {
                setSocialProfile({ discoverable: val });
              }}
              testID="settings-discoverable"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Eye size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('showActivity')}</Text>
            </View>
            <Switch
              value={myProfile ? myProfile.feedVisibility !== 'private' : true}
              onValueChange={(val) => {
                setSocialProfile({ feedVisibility: val ? 'friends' : 'private' });
              }}
              testID="settings-show-activity"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Users size={20} color={Colors.textLight} />
              <Text style={styles.settingLabel}>{t('friendListVisible')}</Text>
            </View>
            <Switch
              value={myProfile ? myProfile.friendListVisible : false}
              onValueChange={(val) => {
                setSocialProfile({ friendListVisible: val });
              }}
              testID="settings-friendlist-visible"
            />
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

        {confirmingSignOut ? (
          <InlineConfirm
            style={styles.signOutConfirm}
            question={t('signOutConfirmation')}
            confirmLabel={t('signOut')}
            destructive
            onConfirm={handleSignOut}
            onCancel={() => setConfirmingSignOut(false)}
            testID="settings-sign-out-confirm"
          />
        ) : (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => setConfirmingSignOut(true)}
            testID="settings-sign-out"
          >
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.signOutText}>{t('signOut')}</Text>
          </TouchableOpacity>
        )}
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
  avatarBlock: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  avatarPreviewWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarSubLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 12,
    marginBottom: 8,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardSecondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiChipActive: {
    borderColor: Colors.primary,
  },
  emojiChipText: {
    fontSize: 20,
  },
  emojiChipAa: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Colors.text,
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
  feedbackText: {
    fontSize: 13,
    marginTop: 10,
  },
  feedbackError: {
    color: Colors.error,
  },
  feedbackSuccess: {
    color: Colors.success,
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
  signOutConfirm: {
    marginTop: 32,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});
