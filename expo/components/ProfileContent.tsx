import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Star, ChefHat, Eye, Flame, Trophy, LogIn } from 'lucide-react-native';

import Avatar from '@/components/Avatar';
import type { Theme } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-auth-gate';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/Button';
import { useSocial } from '@/hooks/use-social';
import { useDailyChefMateStore } from '@/hooks/use-dailychefmate-store';
import { Text } from '@/components/ui/Text';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, onPress }) => {
  const styles = useThemedStyles(makeStyles);
  const inner = (
    <>
      <View style={styles.statIcon}>{icon}</View>
      <View style={styles.statContent}>
        <Text variant="h3">{value}</Text>
        <Text variant="caption" color="secondary">{title}</Text>
        {subtitle && <Text variant="caption" color="muted">{subtitle}</Text>}
      </View>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
        onPress={onPress}
        testID={`stat-card-${title}`}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.statCard}>{inner}</View>;
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.infoRow}>
      <Text variant="body" color="secondary" style={styles.infoLabel}>{label}</Text>
      <Text variant="body" weight="medium" style={styles.infoValue}>{value}</Text>
    </View>
  );
};

interface ProfileContentProps {
  onBeforeNavigate?: () => void;
}

export default function ProfileContent({ onBeforeNavigate }: ProfileContentProps = {}) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const { myProfile } = useSocial();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { getTopCookedRecipes, cookedRecipes, favorites, viewedRecipesCount, customRecipes } = useDailyChefMateStore();
  const ratingSummary = useQuery(
    api.ratings.ratingSummary,
    user?.id ? { userId: user.id as Id<'users'> } : 'skip',
  );

  const profileStats = useMemo(() => {
    const joinDate = user?.created_at ? new Date(user.created_at) : new Date();
    const memberSince = joinDate.toLocaleDateString();
    const lastActive = new Date().toLocaleDateString();
    const topCookedRecipes = getTopCookedRecipes(3);
    const cookedTotal = Object.values(cookedRecipes).reduce((sum, count) => sum + count, 0);
    return {
      memberSince,
      lastActive,
      favoriteCount: favorites.length,
      recipesViewed: viewedRecipesCount,
      createdRecipes: customRecipes.length,
      cookedTotal,
      topCookedRecipes,
    };
  }, [user, getTopCookedRecipes, cookedRecipes, favorites, viewedRecipesCount, customRecipes]);

  if (!user) {
    return (
      <View style={styles.guestCard}>
        <LogIn size={28} color={theme.accent} />
        <Text variant="h2" style={styles.guestTitle}>{t('guestCtaProfile')}</Text>
        <View style={styles.guestActions}>
          <Button label={t('signIn')} fullWidth onPress={() => requireAuth(() => {})} testID="profile-cta-signin" />
          <Button label={t('createAccount')} variant="secondary" fullWidth onPress={() => requireAuth(() => {})} testID="profile-cta-signup" />
        </View>
      </View>
    );
  }

  const medalBadge = [styles.goldBadge, styles.silverBadge, styles.bronzeBadge];

  return (
    <View>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Avatar
            name={myProfile?.displayName || user.username || user.email || '?'}
            initials={myProfile?.initials}
            color={myProfile?.avatarColor ?? undefined}
            emoji={myProfile?.avatarEmoji ?? undefined}
            size={80}
          />
        </View>
        <Text variant="h1" center>{user.username || user.email}</Text>
        <Text variant="body" color="secondary" center>{t('memberSince')} {profileStats.memberSince}</Text>
        {!user.username && (
          <Pressable
            style={styles.usernameBanner}
            onPress={() => {
              onBeforeNavigate?.();
              router.push('/settings');
            }}
            testID="set-username-banner"
          >
            <Text variant="label" weight="semibold" style={{ color: theme.textOnAccent }}>
              {t('setUsernameBanner')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text variant="h2" style={styles.sectionTitle}>{t('personalStats')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Star size={22} color={theme.accent} />}
            title={t('favoriteRecipes')}
            value={profileStats.favoriteCount}
            onPress={() => {
              onBeforeNavigate?.();
              router.push('/(tabs)/favorites');
            }}
          />
          <StatCard icon={<Eye size={22} color={theme.accent} />} title={t('recipesViewed')} value={profileStats.recipesViewed} />
          <StatCard
            icon={<ChefHat size={22} color={theme.accent} />}
            title={t('recipesGenerated')}
            value={profileStats.createdRecipes}
            onPress={() => {
              onBeforeNavigate?.();
              router.push('/(tabs)/(recipes)/homemade');
            }}
          />
          <StatCard icon={<Flame size={22} color={theme.accent} />} title={t('totalRecipes')} value={profileStats.cookedTotal} />
        </View>

        <View style={styles.ratingStatRow}>
          <Star size={20} color={theme.star} fill={theme.star} />
          <Text variant="h3">
            {ratingSummary && ratingSummary.ratingCount > 0 ? `★ ${ratingSummary.avg.toFixed(1)}` : '–'}
          </Text>
          <Text variant="bodySm" color="secondary">
            {t('avgRecipeRating')} · {ratingSummary?.distinctRaters ?? 0} {t('ratedByPeople')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h2" style={styles.sectionTitle}>{t('accountDetails')}</Text>
        <View style={styles.infoCard}>
          <InfoRow label={t('email')} value={user.email || 'N/A'} />
          <View style={styles.divider} />
          <InfoRow label={t('joinedOn')} value={profileStats.memberSince} />
          <View style={styles.divider} />
          <InfoRow label={t('lastActive')} value={profileStats.lastActive} />
          {user.user_metadata?.provider && (
            <>
              <View style={styles.divider} />
              <InfoRow
                label={t('provider')}
                value={user.user_metadata.provider.charAt(0).toUpperCase() + user.user_metadata.provider.slice(1)}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="h2" style={styles.sectionTitle}>{t('topCookedDishes')}</Text>
        {profileStats.topCookedRecipes.length > 0 ? (
          <View style={styles.topDishesContainer}>
            {profileStats.topCookedRecipes.map((entry, index) => (
              <View key={entry.recipe.id} style={styles.topDishItem}>
                <View style={styles.rankContainer}>
                  <View style={[styles.rankBadge, medalBadge[index]]}>
                    <Text variant="label" weight="bold" style={{ color: index < 3 ? '#FFFFFF' : theme.textPrimary }}>
                      {index + 1}
                    </Text>
                  </View>
                  {index === 0 && <Trophy size={16} color={theme.metal.gold} style={styles.trophyIcon} />}
                </View>

                <View style={styles.dishImageContainer}>
                  <Image
                    source={{ uri: entry.recipe.image }}
                    style={styles.dishImage}
                    defaultSource={require('@/assets/images/icon.png')}
                  />
                </View>

                <View style={styles.dishInfo}>
                  <Text variant="title" numberOfLines={2}>{entry.recipe.name}</Text>
                  <Text variant="bodySm" color="secondary">{entry.count} {t('cookedTimes')}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noCookedDishesContainer}>
            <ChefHat size={40} color={theme.textMuted} />
            <Text variant="body" color="secondary" center style={styles.noCookedDishesText}>{t('noCookedDishes')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    centerContent: { padding: t.space[8], justifyContent: 'center', alignItems: 'center' },
    guestCard: {
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.lg,
      padding: t.space[6],
      marginTop: t.space[4],
    },
    guestTitle: { marginTop: t.space[3], marginBottom: t.space[5], textAlign: 'center' },
    guestActions: { width: '100%', gap: t.space[3] },
    profileHeader: { alignItems: 'center', marginBottom: t.space[8], paddingVertical: t.space[6] },
    avatarContainer: {
      marginBottom: t.space[4],
      padding: t.space[5],
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: 60,
      ...t.elevation.sm,
    },
    usernameBanner: {
      marginTop: t.space[3],
      paddingVertical: t.space[2],
      paddingHorizontal: t.space[4],
      borderRadius: t.radius.pill,
      backgroundColor: t.accent,
    },
    section: { marginBottom: t.space[8] },
    sectionTitle: { marginBottom: t.space[4] },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: t.space[3] },
    ratingStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space[2],
      marginTop: t.space[4],
      flexWrap: 'wrap',
    },
    statCard: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      padding: t.space[4],
      flexDirection: 'row',
      alignItems: 'center',
      width: '48%',
      minHeight: 80,
    },
    statCardPressed: { opacity: 0.85 },
    statIcon: { marginRight: t.space[3] },
    statContent: { flex: 1 },
    infoCard: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      padding: t.space[4],
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: t.space[3] },
    infoLabel: { flex: 1 },
    infoValue: { flex: 1, textAlign: 'right' },
    divider: { height: t.borderWidth.hairline, backgroundColor: t.border, marginHorizontal: -t.space[4] },
    topDishesContainer: { gap: t.space[3] },
    topDishItem: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      padding: t.space[4],
      flexDirection: 'row',
      alignItems: 'center',
    },
    rankContainer: { flexDirection: 'row', alignItems: 'center', marginRight: t.space[3] },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.surfaceSunken,
      justifyContent: 'center',
      alignItems: 'center',
    },
    goldBadge: { backgroundColor: t.metal.gold },
    silverBadge: { backgroundColor: t.metal.silver },
    bronzeBadge: { backgroundColor: t.metal.bronze },
    trophyIcon: { marginLeft: 4 },
    dishImageContainer: { marginRight: t.space[3] },
    dishImage: { width: 50, height: 50, borderRadius: t.radius.sm, backgroundColor: t.surfaceSunken },
    dishInfo: { flex: 1 },
    noCookedDishesContainer: {
      alignItems: 'center',
      padding: t.space[8],
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
    },
    noCookedDishesText: { marginTop: t.space[3] },
  });
