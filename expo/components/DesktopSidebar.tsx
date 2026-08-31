import { router, usePathname } from 'expo-router';
import { BookOpen, CalendarDays, LogOut, Refrigerator, Settings, Star, UserCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import InlineConfirm from '@/components/InlineConfirm';
import { LanguageSelector } from '@/components/LanguageSelector';

interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  match: (pathname: string) => boolean;
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [confirmingSignOut, setConfirmingSignOut] = useState<boolean>(false);

  const navItems: NavItem[] = [
    {
      key: 'recipes',
      href: '/(tabs)/(recipes)/all',
      label: t('recipes'),
      icon: BookOpen,
      match: (p) => p.includes('/all') || p.includes('/homemade'),
    },
    {
      key: 'refrigerator',
      href: '/(tabs)/refrigerator',
      label: t('refrigerator'),
      icon: Refrigerator,
      match: (p) => p.includes('/refrigerator'),
    },
    {
      key: 'planner',
      href: '/(tabs)/planner',
      label: t('weekPlan'),
      icon: CalendarDays,
      match: (p) => p.includes('/planner'),
    },
    {
      key: 'favorites',
      href: '/(tabs)/favorites',
      label: t('favorites'),
      icon: Star,
      match: (p) => p.includes('/favorites'),
    },
  ];

  const handleSignOut = async () => {
    setConfirmingSignOut(false);
    await signOut();
  };

  return (
    <View style={styles.sidebar}>
      <Pressable style={styles.brand} onPress={() => router.push('/(tabs)/(recipes)/all')}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      </Pressable>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href as any)}
            >
              <Icon size={20} color={active ? Colors.primary : Colors.textLight} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <LanguageSelector />

        <Pressable
          style={[styles.navItem, pathname.includes('/profile') && styles.navItemActive]}
          onPress={() => router.push('/profile')}
        >
          <UserCircle size={20} color={pathname.includes('/profile') ? Colors.primary : Colors.textLight} />
          <Text style={styles.userName} numberOfLines={1}>{user?.username || user?.email || t('profile')}</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => router.push('/settings')}>
          <Settings size={20} color={Colors.textLight} />
          <Text style={styles.navLabel}>{t('settings')}</Text>
        </Pressable>

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
          <Pressable style={styles.navItem} onPress={() => setConfirmingSignOut(true)}>
            <LogOut size={20} color={Colors.error} />
            <Text style={[styles.navLabel, styles.signOutText]}>{t('signOut')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 248,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    backgroundColor: Colors.background,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  brand: {
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logo: {
    width: 116,
    height: 74,
  },
  nav: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: Colors.cardSecondary,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  navLabelActive: {
    color: Colors.primary,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  signOutText: {
    color: Colors.error,
  },
  signOutConfirm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
