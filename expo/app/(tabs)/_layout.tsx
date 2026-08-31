import { Tabs } from "expo-router";
import { BookOpen, CalendarDays, Refrigerator, Settings, Star } from "lucide-react-native";
import React from "react";
import { StyleSheet } from "react-native";

import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";
import { useIsDesktop } from "@/hooks/use-responsive";

// The header is rendered per-screen as <CollapsingTabHeader /> (mobile) so
// it can hide on scroll — the built-in tab header is off everywhere.
export default function TabLayout() {
  const { t } = useLanguage();
  const isDesktop = useIsDesktop();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: isDesktop ? styles.tabBarHidden : styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="(recipes)"
        options={{
          title: t('recipes'),
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="refrigerator"
        options={{
          title: t('refrigerator'),
          tabBarIcon: ({ color }) => <Refrigerator size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: t('weekPlan'),
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color }) => <Star size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarHidden: {
    display: 'none',
  },
  tabBar: {
    elevation: 10,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -2 },
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 60,
    paddingTop: 6,
    backgroundColor: Colors.tabBarTint,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
