import { router } from 'expo-router';
import { LogOut, Settings, UserCircle, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import ProfileContent from '@/components/ProfileContent';

export default function ProfileMenuButton() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const handleSignOut = () => {
    Alert.alert(
      t('signOut'),
      t('signOutConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOut'),
          style: 'destructive',
          onPress: () => {
            setIsVisible(false);
            signOut();
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    setIsVisible(false);
    router.push('/settings');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setIsVisible(true)}
        testID="profile-menu-button"
      >
        <UserCircle size={24} color={Colors.primary} />
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
              <Text style={styles.sheetTitle}>{t('profile')}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)} testID="profile-sheet-close">
                <X size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <ProfileContent />

              <View style={styles.footer}>
                <TouchableOpacity style={styles.footerRow} onPress={handleSignOut} testID="profile-sheet-sign-out">
                  <LogOut size={20} color={Colors.error} />
                  <Text style={[styles.footerText, styles.signOutText]}>{t('signOut')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerRow} onPress={handleSettings} testID="profile-sheet-settings">
                  <Settings size={20} color={Colors.text} />
                  <Text style={styles.footerText}>{t('settings')}</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>{t('version')} 1.0.0</Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sheetContent: {
    padding: 20,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  footerText: {
    fontSize: 16,
    color: Colors.text,
  },
  signOutText: {
    color: Colors.error,
  },
  versionText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
