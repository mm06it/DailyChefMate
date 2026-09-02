import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Globe, Info, Pencil, Users, Eye, Smile, Moon, Dumbbell } from 'lucide-react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useConvex, useMutation } from 'convex/react';

import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useTheme, type ThemeMode } from '@/hooks/use-theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useFitnessMode } from '@/hooks/use-fitness-mode';
import { useSocial } from '@/hooks/use-social';
import { useIsDesktop } from '@/hooks/use-responsive';
import type { Theme } from '@/constants/theme';
import InlineConfirm from '@/components/InlineConfirm';
import CollapsingTabHeader, {
  resetHeader,
  useHeaderContentPadding,
} from '@/components/CollapsingTabHeader';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Avatar from '@/components/Avatar';
import HelpFeedbackRow from '@/components/HelpFeedbackRow';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '@/constants/avatar';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

type Feedback = { type: 'error' | 'success'; text: string } | null;

export default function SettingsScreen() {
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  useFocusEffect(useCallback(() => resetHeader(), []));

  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { theme, mode: themeMode, setMode: setThemeMode } = useTheme();
  const { enabled: fitnessMode, setEnabled: setFitnessMode } = useFitnessMode();
  const styles = useThemedStyles(makeStyles);
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
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.textPrimary,
        }}
      />
      {!isDesktop && <CollapsingTabHeader showBack />}
      <ScrollView contentContainerStyle={[styles.content, !isDesktop && { paddingTop: topPad + 20 }]}>
        <ResponsiveContainer maxWidth={640}>
          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>{t('account')}</Text>

            <View style={[styles.settingItem, styles.settingItemColumn]}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <User size={20} color={theme.textMuted} />
                  <Text variant="body" style={styles.settingLabel}>{t('username')}</Text>
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
                    placeholderTextColor={theme.textMuted}
                    testID="settings-username-input"
                  />
                ) : (
                  <Pressable style={styles.settingValueRow} onPress={startEditing} testID="settings-username-edit">
                    <Text variant="body" color="secondary">{currentUsername || '-'}</Text>
                    <Pencil size={16} color={theme.textMuted} />
                  </Pressable>
                )}
              </View>

              {editing && (
                <View style={styles.editActions}>
                  <Button label={t('cancel')} variant="secondary" size="sm" disabled={saving} onPress={cancelEditing} testID="settings-username-cancel" />
                  <Button label={t('save')} size="sm" loading={saving} onPress={saveUsername} testID="settings-username-save" />
                </View>
              )}

              {feedback && (
                <Text
                  variant="bodySm"
                  color={feedback.type === 'error' ? 'danger' : 'success'}
                  style={styles.feedbackText}
                  testID="settings-username-feedback"
                >
                  {feedback.text}
                </Text>
              )}
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <User size={20} color={theme.textMuted} />
                <Text variant="body" style={styles.settingLabel}>{t('email')}</Text>
              </View>
              <Text variant="body" color="secondary">{user?.email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>{t('preferences')}</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Globe size={20} color={theme.textMuted} />
                <Text variant="body" style={styles.settingLabel}>{t('language')}</Text>
              </View>
              <LanguageSelector />
            </View>

            <View style={[styles.settingItem, styles.settingItemColumn]}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Moon size={20} color={theme.textMuted} />
                  <Text variant="body" style={styles.settingLabel}>{t('appearance')}</Text>
                </View>
              </View>
              <View style={styles.themeToggle}>
                <SegmentedControl<ThemeMode>
                  options={[
                    { value: 'system', label: t('themeSystem') },
                    { value: 'light', label: t('themeLight') },
                    { value: 'dark', label: t('themeDark') },
                  ]}
                  value={themeMode}
                  onChange={setThemeMode}
                  testID="settings-theme"
                />
              </View>
            </View>

            <View style={[styles.settingItem, styles.settingItemColumn]}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Dumbbell size={20} color={theme.textMuted} />
                  <Text variant="body" style={styles.settingLabel}>{t('fitnessMode')}</Text>
                </View>
                <Switch
                  value={fitnessMode}
                  onValueChange={setFitnessMode}
                  trackColor={{ true: theme.accent, false: theme.borderStrong }}
                  testID="settings-fitness-mode"
                />
              </View>
              <Text variant="bodySm" color="secondary" style={styles.feedbackText}>
                {t('fitnessModeHint')}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>{t('socialProfile')}</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <User size={20} color={theme.textMuted} />
                <Text variant="body" style={styles.settingLabel}>{t('displayName')}</Text>
              </View>
              <TextInput
                style={styles.usernameInput}
                value={displayNameDraft}
                onChangeText={setDisplayNameDraft}
                maxLength={40}
                placeholder={user?.username ?? ''}
                placeholderTextColor={theme.textMuted}
                onEndEditing={() => setSocialProfile({ displayName: displayNameDraft.trim() })}
                returnKeyType="done"
                testID="settings-displayname-input"
              />
            </View>

            <View style={styles.avatarBlock}>
              <View style={styles.settingLeft}>
                <Smile size={20} color={theme.textMuted} />
                <Text variant="body" style={styles.settingLabel}>{t('avatar')}</Text>
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

              <Text variant="label" color="secondary" style={styles.avatarSubLabel}>{t('avatarSymbol')}</Text>
              <View style={styles.avatarGrid}>
                <Pressable
                  style={[styles.emojiChip, !myProfile?.avatarEmoji && styles.emojiChipActive]}
                  onPress={() => setSocialProfile({ avatarEmoji: '' })}
                  testID="avatar-emoji-initials"
                >
                  <Text variant="label" weight="bold">{t('avatarInitialsOption')}</Text>
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

              <Text variant="label" color="secondary" style={styles.avatarSubLabel}>{t('avatarBackground')}</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.swatch,
                      c === 'transparent' ? styles.swatchTransparent : { backgroundColor: c },
                      myProfile?.avatarColor === c && styles.swatchActive,
                    ]}
                    onPress={() => setSocialProfile({ avatarColor: c })}
                    testID={`avatar-color-${c}`}
                  >
                    {c === 'transparent' && <Text variant="caption" weight="bold" color="secondary">Aa</Text>}
                  </Pressable>
                ))}
              </View>
            </View>

            {(['discoverable', 'showActivity', 'friendListVisible'] as const).map((key) => {
              const Icon = key === 'showActivity' ? Eye : Users;
              const value =
                key === 'discoverable'
                  ? (myProfile ? myProfile.discoverable : true)
                  : key === 'showActivity'
                    ? (myProfile ? myProfile.feedVisibility !== 'private' : true)
                    : (myProfile ? myProfile.friendListVisible : false);
              const onChange = (val: boolean) => {
                if (key === 'discoverable') setSocialProfile({ discoverable: val });
                else if (key === 'showActivity') setSocialProfile({ feedVisibility: val ? 'friends' : 'private' });
                else setSocialProfile({ friendListVisible: val });
              };
              return (
                <View key={key} style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Icon size={20} color={theme.textMuted} />
                    <Text variant="body" style={styles.settingLabel}>{t(key)}</Text>
                  </View>
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ true: theme.accent, false: theme.borderStrong }}
                    testID={`settings-${key}`}
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text variant="h2" style={styles.sectionTitle}>{t('about')}</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Info size={20} color={theme.textMuted} />
                <Text variant="body" style={styles.settingLabel}>{t('version')}</Text>
              </View>
              <Text variant="body" color="secondary">1.0.0</Text>
            </View>
            <HelpFeedbackRow style={styles.helpRow} />
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
            <Button
              label={t('signOut')}
              variant="danger"
              fullWidth
              leftIcon={<LogOut size={18} color={theme.textOnAccent} />}
              onPress={() => setConfirmingSignOut(true)}
              testID="settings-sign-out"
              style={styles.signOutButton}
            />
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bgSubtle },
    content: { padding: t.space[6] },
    section: { marginBottom: t.space[8] },
    sectionTitle: { marginBottom: t.space[4] },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: t.space[4],
      paddingHorizontal: t.space[4],
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      marginBottom: t.space[2],
    },
    settingItemColumn: { flexDirection: 'column', alignItems: 'stretch' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingLabel: { marginLeft: t.space[3] },
    themeToggle: { marginTop: t.space[4] },
    avatarBlock: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      padding: t.space[4],
      marginBottom: t.space[2],
    },
    avatarPreviewWrap: { alignItems: 'center', marginVertical: t.space[4] },
    avatarSubLabel: { marginTop: t.space[3], marginBottom: t.space[2] },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    emojiChip: {
      width: 40,
      height: 40,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceSunken,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    emojiChipActive: { borderColor: t.accent },
    emojiChipText: { fontSize: 20 },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 3,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchTransparent: { backgroundColor: t.surface, borderColor: t.border },
    swatchActive: { borderColor: t.textPrimary },
    usernameInput: {
      flex: 1,
      marginLeft: t.space[3],
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.textPrimary,
      textAlign: 'right',
      paddingVertical: 0,
    },
    settingValueRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: t.space[2], marginTop: t.space[3] },
    feedbackText: { marginTop: t.space[3] },
    helpRow: { marginTop: t.space[2] },
    signOutButton: { marginTop: t.space[8] },
    signOutConfirm: { marginTop: t.space[8] },
  });
