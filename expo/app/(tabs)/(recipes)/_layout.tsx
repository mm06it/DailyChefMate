import React, { useCallback } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
  type MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { useFocusEffect, withLayoutContext } from 'expo-router';
import { useLanguage } from '@/hooks/use-language';
import CollapsingTabHeader, {
  headerTranslateY,
  resetHeader,
  useHeaderContentPadding,
} from '@/components/CollapsingTabHeader';
import RecipeFilterBar from '@/components/RecipeFilterBar';
import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { CollapsibleHeaderProvider } from '@/hooks/use-collapsible-header';
import { RecipeFiltersProvider } from '@/hooks/use-recipe-filters';
import { useIsDesktop } from '@/hooks/use-responsive';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

// Search + cuisine/course filters render as part of the tab bar — i.e.
// OUTSIDE react-native-tab-view's swipeable pager — so swiping across the
// chips scrolls them instead of flipping to the "Selbsterstellte Rezepte"
// sub-tab. Search shows on both sub-tabs; the chips only on "Alle Rezepte".
function renderTabBar(props: MaterialTopTabBarProps) {
  return (
    <View>
      <MaterialTopTabBar {...props} />
      <RecipeFilterBar
        showFilters={props.state.index === 0}
        showAddRecipe={props.state.index === 1}
      />
    </View>
  );
}

function TabsWithCollapsibleBar() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <MaterialTopTabs
      tabBar={renderTabBar}
      screenOptions={{
        tabBarActiveTintColor: theme.textPrimary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarIndicatorStyle: {
          backgroundColor: theme.accent,
          height: 2,
          borderRadius: 999,
          marginHorizontal: 18,
          opacity: 1,
        },
        tabBarStyle: {
          backgroundColor: theme.bg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: theme.borderWidth.hairline,
          borderBottomColor: theme.border,
          opacity: 1,
          overflow: 'hidden' as const,
        },
        tabBarLabelStyle: {
          fontFamily: theme.font.bodySemibold,
          fontSize: 14,
          textTransform: 'none',
        },
      }}
    >
      <MaterialTopTabs.Screen
        name="all"
        options={{
          title: t('allRecipes'),
        }}
      />
      <MaterialTopTabs.Screen
        name="homemade"
        options={{
          title: t('homemadeRecipes'),
        }}
      />
    </MaterialTopTabs>
  );
}

export default function RecipesLayout() {
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();
  const styles = useThemedStyles(makeStyles);

  useFocusEffect(useCallback(() => resetHeader(), []));

  return (
    <CollapsibleHeaderProvider>
      <RecipeFiltersProvider>
        <View style={styles.container}>
          {isDesktop ? (
            <TabsWithCollapsibleBar />
          ) : (
            <>
              <CollapsingTabHeader />
              <Animated.View
                style={[
                  styles.tabsWrap,
                  { paddingTop: topPad, marginBottom: -topPad, transform: [{ translateY: headerTranslateY }] },
                ]}
              >
                <TabsWithCollapsibleBar />
              </Animated.View>
            </>
          )}
        </View>
      </RecipeFiltersProvider>
    </CollapsibleHeaderProvider>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    tabsWrap: {
      flex: 1,
    },
  });
