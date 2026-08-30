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
import Colors from '@/constants/colors';
import { CollapsibleHeaderProvider } from '@/hooks/use-collapsible-header';
import { RecipeFiltersProvider } from '@/hooks/use-recipe-filters';
import { useIsDesktop } from '@/hooks/use-responsive';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

// The cuisine / course filters render as part of the tab bar — i.e. OUTSIDE
// react-native-tab-view's swipeable pager — so swiping across the chips
// scrolls them instead of flipping to the "Selbsterstellte Rezepte" sub-tab.
// Only the first sub-tab ("Alle Rezepte") shows them.
function renderTabBar(props: MaterialTopTabBarProps) {
  return (
    <View>
      <MaterialTopTabBar {...props} />
      <RecipeFilterBar visible={props.state.index === 0} />
    </View>
  );
}

function TabsWithCollapsibleBar() {
  const { t } = useLanguage();

  return (
    <MaterialTopTabs
      tabBar={renderTabBar}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarIndicatorStyle: {
          backgroundColor: Colors.primary,
          height: 4,
          borderRadius: 999,
          marginHorizontal: 18,
          opacity: 1,
        },
        tabBarStyle: {
          backgroundColor: Colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          opacity: 1,
          overflow: 'hidden' as const,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '700',
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabsWrap: {
    flex: 1,
  },
});
