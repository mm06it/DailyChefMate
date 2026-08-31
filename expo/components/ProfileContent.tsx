import { router } from 'expo-router';
import { useQuery } from 'convex/react';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { UserCircle, Star, ChefHat, Eye, Flame, Trophy } from 'lucide-react-native';

import Colors from '@/constants/colors';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useDailyChefMateStore } from '@/hooks/use-dailychefmate-store';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, onPress }) => {
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.statCard, pressed && styles.statCardPressed]}
        onPress={onPress}
        testID={`stat-card-${title}`}
      >
        <View style={styles.statIcon}>
          {icon}
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

interface ProfileContentProps {
  // Called right before navigating away (e.g. to close a modal/sheet this
  // is rendered inside of). No-op by default for the full-page profile.
  onBeforeNavigate?: () => void;
}

export default function ProfileContent({ onBeforeNavigate }: ProfileContentProps = {}) {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{t('userNotFound')}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <UserCircle size={80} color={Colors.primary} />
        </View>
        <Text style={styles.userName}>{user.username || user.email}</Text>
        <Text style={styles.userSubtitle}>{t('memberSince')} {profileStats.memberSince}</Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('personalStats')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Star size={24} color={Colors.primary} />}
            title={t('favoriteRecipes')}
            value={profileStats.favoriteCount}
            onPress={() => {
              onBeforeNavigate?.();
              router.push('/(tabs)/favorites');
            }}
          />
          <StatCard
            icon={<Eye size={24} color={Colors.primary} />}
            title={t('recipesViewed')}
            value={profileStats.recipesViewed}
          />
          <StatCard
            icon={<ChefHat size={24} color={Colors.primary} />}
            title={t('recipesGenerated')}
            value={profileStats.createdRecipes}
            onPress={() => {
              onBeforeNavigate?.();
              router.push('/(tabs)/(recipes)/homemade');
            }}
          />
          <StatCard
            icon={<Flame size={24} color={Colors.primary} />}
            title={t('totalRecipes')}
            value={profileStats.cookedTotal}
          />
        </View>

        <View style={styles.ratingStatRow}>
          <Star size={22} color={Colors.star} fill={Colors.star} />
          <Text style={styles.ratingStatValue}>
            {ratingSummary && ratingSummary.ratingCount > 0 ? `★ ${ratingSummary.avg.toFixed(1)}` : '–'}
          </Text>
          <Text style={styles.ratingStatLabel}>
            {t('avgRecipeRating')} · {ratingSummary?.distinctRaters ?? 0} {t('ratedByPeople')}
          </Text>
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('accountDetails')}</Text>
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

      {/* Top 3 Cooked Dishes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('topCookedDishes')}</Text>
        {profileStats.topCookedRecipes.length > 0 ? (
          <View style={styles.topDishesContainer}>
            {profileStats.topCookedRecipes.map((entry, index) => (
              <View key={entry.recipe.id} style={styles.topDishItem}>
                <View style={styles.rankContainer}>
                  <View style={[
                    styles.rankBadge,
                    index === 0 && styles.goldBadge,
                    index === 1 && styles.silverBadge,
                    index === 2 && styles.bronzeBadge,
                  ]}>
                    <Text style={[
                      styles.rankText,
                      index === 0 && styles.goldText,
                      index === 1 && styles.silverText,
                      index === 2 && styles.bronzeText,
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  {index === 0 && <Trophy size={16} color="#FFD700" style={styles.trophyIcon} />}
                </View>

                <View style={styles.dishImageContainer}>
                  <Image
                    source={{ uri: entry.recipe.image }}
                    style={styles.dishImage}
                    defaultSource={require('@/assets/images/icon.png')}
                  />
                </View>

                <View style={styles.dishInfo}>
                  <Text style={styles.dishName} numberOfLines={2}>
                    {entry.recipe.name}
                  </Text>
                  <Text style={styles.cookedCount}>
                    {entry.count} {t('cookedTimes')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noCookedDishesContainer}>
            <ChefHat size={48} color={Colors.textLight} />
            <Text style={styles.noCookedDishesText}>{t('noCookedDishes')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: Colors.card,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  userSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  ratingStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  ratingStatLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  statCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardPressed: {
    opacity: 0.7,
  },
  statIcon: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  statSubtitle: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.textLight,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: -16,
  },
  topDishesContainer: {
    gap: 12,
  },
  topDishItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldBadge: {
    backgroundColor: '#FFD700',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  goldText: {
    color: '#B8860B',
  },
  silverText: {
    color: '#696969',
  },
  bronzeText: {
    color: '#8B4513',
  },
  trophyIcon: {
    marginLeft: 4,
  },
  dishImageContainer: {
    marginRight: 12,
  },
  dishImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cookedCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  noCookedDishesContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  noCookedDishesText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
});
