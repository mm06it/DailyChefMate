import { LogOut, UserCircle, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import InlineConfirm from '@/components/InlineConfirm';
import ProfileContent from '@/components/ProfileContent';
import { Text } from '@/components/ui/Text';

export default function ProfileMenuButton() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState<boolean>(false);

  const handleSignOut = async () => {
    setConfirmingSignOut(false);
    setIsVisible(false);
    await signOut();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          setConfirmingSignOut(false);
          setIsVisible(true);
        }}
        testID="profile-menu-button"
      >
        <UserCircle size={24} color={theme.textPrimary} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />

            <View style={styles.sheetHeader}>
              <Text variant="h3">{t('profile')}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)} testID="profile-sheet-close">
                <X size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <ProfileContent onBeforeNavigate={() => setIsVisible(false)} />

              <View style={styles.footer}>
                {confirmingSignOut ? (
                  <InlineConfirm
                    style={styles.signOutConfirm}
                    question={t('signOutConfirmation')}
                    confirmLabel={t('signOut')}
                    destructive
                    onConfirm={handleSignOut}
                    onCancel={() => setConfirmingSignOut(false)}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.footerRow}
                    onPress={() => setConfirmingSignOut(true)}
                    testID="profile-sheet-sign-out"
                  >
                    <LogOut size={20} color={theme.danger} />
                    <Text variant="body" style={{ color: theme.danger }}>{t('signOut')}</Text>
                  </TouchableOpacity>
                )}

                <Text variant="bodySm" color="muted" center style={styles.versionText}>
                  {t('version')} 1.0.0
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    headerButton: {
      padding: 8,
      marginRight: 8,
    },
    overlay: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '85%',
      backgroundColor: t.surfaceRaised,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingTop: 8,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.borderStrong,
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.space[6],
      paddingBottom: t.space[4],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    sheetContent: {
      padding: t.space[6],
    },
    footer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: t.borderWidth.hairline,
      borderTopColor: t.border,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
    },
    signOutConfirm: {
      paddingVertical: 12,
    },
    versionText: {
      paddingVertical: 12,
    },
  });
