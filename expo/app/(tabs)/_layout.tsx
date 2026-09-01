import { Tabs } from "expo-router";
import { BookOpen, CalendarDays, Refrigerator, ShieldCheck, Star, Users } from "lucide-react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/hooks/use-language";
import { useSocial } from "@/hooks/use-social";
import { useTheme } from "@/hooks/use-theme";
import { useIsDesktop } from "@/hooks/use-responsive";

// The header is rendered per-screen as <CollapsingTabHeader /> (mobile) so
// it can hide on scroll — the built-in tab header is off everywhere.
export default function TabLayout() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { badgeCount, counts, isAdmin } = useSocial();

  const barHeight = theme.layout.tabBarHeight + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.textPrimary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: isDesktop
          ? { display: "none" }
          : {
              height: barHeight,
              paddingBottom: insets.bottom,
              paddingTop: 8,
              backgroundColor: theme.surface,
              borderTopWidth: theme.borderWidth.hairline,
              borderTopColor: theme.border,
              // No colored glow — a hairline top border is the whole treatment.
              elevation: 0,
              shadowOpacity: 0,
            },
        tabBarLabelStyle: {
          fontFamily: theme.font.bodyMedium,
          fontSize: 11,
        },
        tabBarIconStyle: { marginTop: 2 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="(recipes)"
        options={{
          title: t("recipes"),
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="refrigerator"
        options={{
          title: t("refrigerator"),
          tabBarIcon: ({ color }) => <Refrigerator size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: t("weekPlan"),
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("favorites"),
          tabBarIcon: ({ color }) => <Star size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: t("social"),
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t("adminPanel"),
          tabBarIcon: ({ color }) => <ShieldCheck size={22} color={color} />,
          tabBarBadge: isAdmin && counts.adminOpen > 0 ? counts.adminOpen : undefined,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
