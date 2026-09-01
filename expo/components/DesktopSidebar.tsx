import { router, usePathname } from 'expo-router';
import { BookOpen, CalendarDays, LogOut, Refrigerator, Settings, ShieldCheck, Star, UserCircle, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useSocial } from '@/hooks/use-social';
import InlineConfirm from '@/components/InlineConfirm';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Text } from '@/components/ui/Text';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isAdmin, counts } = useSocial();
  const [confirmingSignOut, setConfirmingSignOut] = useState<boolean>(false);

  const navItems: NavItem[] = [
    { key: 'recipes', href: '/(tabs)/(recipes)/all', label: t('recipes'), icon: BookOpen, match: (p) => p.includes('/all') || p.includes('/homemade') },
    { key: 'refrigerator', href: '/(tabs)/refrigerator', label: t('refrigerator'), icon: Refrigerator, match: (p) => p.includes('/refrigerator') },
    { key: 'planner', href: '/(tabs)/planner', label: t('weekPlan'), icon: CalendarDays, match: (p) => p.includes('/planner') },
    { key: 'favorites', href: '/(tabs)/favorites', label: t('favorites'), icon: Star, match: (p) => p.includes('/favorites') },
    { key: 'social', href: '/(tabs)/social', label: t('social'), icon: Users, match: (p) => p.includes('/social') },
    ...(isAdmin
      ? [{ key: 'admin', href: '/(tabs)/admin', label: t('adminPanel'), icon: ShieldCheck, match: (p: string) => p.includes('/admin') }]
      : []),
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
              {active && <View style={styles.activeBar} />}
              <Icon size={20} color={active ? theme.textPrimary : theme.textSecondary} />
              <Text
                variant="label"
                style={[styles.navLabel, active && styles.navLabelActive]}
              >
                {item.label}
              </Text>
              {item.key === 'admin' && counts.adminOpen > 0 && (
                <View style={styles.navBadge}>
                  <Text variant="caption" style={styles.navBadgeText}>
                    {counts.adminOpen > 99 ? '99+' : counts.adminOpen}
                  </Text>
                </View>
              )}
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
          <UserCircle size={20} color={pathname.includes('/profile') ? theme.textPrimary : theme.textSecondary} />
          <Text variant="label" style={styles.navLabel} numberOfLines={1}>
            {user?.username || user?.email || t('profile')}
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => router.push('/settings')}>
          <Settings size={20} color={theme.textSecondary} />
          <Text variant="label" style={styles.navLabel}>{t('settings')}</Text>
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
            <LogOut size={20} color={theme.danger} />
            <Text variant="label" style={[styles.navLabel, { color: theme.danger }]}>
              {t('signOut')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    sidebar: {
      width: t.layout.sidebarWidth,
      borderRightWidth: t.borderWidth.hairline,
      borderRightColor: t.border,
      backgroundColor: t.bg,
      paddingVertical: t.space[7],
      paddingHorizontal: t.space[4],
    },
    brand: {
      alignItems: 'flex-start',
      marginBottom: t.space[8],
      paddingHorizontal: t.space[3],
    },
    logo: { width: 116, height: 74 },
    nav: { gap: t.space[1] },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[4],
      paddingVertical: t.space[3],
      paddingHorizontal: t.space[4],
      borderRadius: t.radius.sm,
    },
    navItemActive: { backgroundColor: t.surfaceSunken },
    activeBar: {
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 999,
      backgroundColor: t.accent,
    },
    navLabel: { color: t.textSecondary },
    navLabelActive: { color: t.textPrimary, fontFamily: t.font.bodySemibold },
    navBadge: {
      marginLeft: 'auto',
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBadgeText: { color: t.textOnAccent, fontFamily: t.font.bodyBold },
    footer: {
      marginTop: 'auto',
      paddingTop: t.space[7],
      borderTopWidth: t.borderWidth.hairline,
      borderTopColor: t.border,
      gap: t.space[1],
    },
    signOutConfirm: { paddingHorizontal: t.space[4], paddingVertical: t.space[3] },
  });
