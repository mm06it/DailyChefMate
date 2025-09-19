import { User, LogOut, Settings, UserCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';

type TabBarButtonState = { selected?: boolean } | undefined;

type AccountMenuProps = React.ComponentProps<typeof Pressable> & {
  accessibilityState?: TabBarButtonState;
};

export const AccountMenu: React.FC<AccountMenuProps> = ({ accessibilityState, style, ...pressableProps }) => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const isSelected = accessibilityState?.selected ?? false;

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
          onPress: () => {
            signOut();
            setIsModalVisible(false);
          },
        },
      ]
    );
  };

  return (
    <React.Fragment>
      <Pressable
        {...pressableProps}
        style={[style, styles.accountButton]}
        onPress={() => setIsModalVisible(true)}
        testID="account-menu-button"
      >
        {({ pressed }) => (
          <UserCircle size={24} color={pressed || isSelected ? Colors.primary : Colors.textLight} />)
        }
      </Pressable>
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.userInfo}>
              <UserCircle size={40} color={Colors.primary} />
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsModalVisible(false);
                router.push('/profile');
              }}
              testID="profile-option"
            >
              <User size={20} color={Colors.text} />
              <Text style={styles.menuOptionText}>{t('profile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setIsModalVisible(false);
                router.push('/settings');
              }}
              testID="settings-option"
            >
              <Settings size={20} color={Colors.text} />
              <Text style={styles.menuOptionText}>{t('settings')}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.menuOption, styles.signOutOption]}
              onPress={handleSignOut}
              testID="sign-out-option"
            >
              <LogOut size={20} color={Colors.error} />
              <Text style={[styles.menuOptionText, styles.signOutText]}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </React.Fragment>
  );
};

const styles = StyleSheet.create({
  accountButton: {
    padding: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  signOutOption: {
    marginTop: 4,
  },
  menuOptionText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  signOutText: {
    color: Colors.error,
  },
});