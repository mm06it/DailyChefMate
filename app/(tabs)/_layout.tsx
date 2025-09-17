import { Tabs } from "expo-router";
import { BookOpen, Refrigerator, Star } from "lucide-react-native";
import React from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

import { LanguageSelector } from "@/components/LanguageSelector";
import { AccountMenu } from "@/components/AccountMenu";
import Colors from "@/constants/colors";
import { useLanguage } from "@/hooks/use-language";

const HeaderTitle = () => (
  <View style={styles.headerContainer}>
    <Image 
      source={{ uri: 'https://r2-pub.rork.com/attachments/mfxb024l2x0j1masip1hg' }}
      style={styles.logo}
    />
    <Text style={styles.fridgyTitle}>Fridgy</Text>
  </View>
);

const HeaderLeft = () => (
  <View style={styles.headerSide}>
    <LanguageSelector />
  </View>
);

const HeaderRight = () => (
  <View style={styles.headerSide}>
    <AccountMenu />
  </View>
);

export default function TabLayout() {
  const { t } = useLanguage();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: true,
        headerStyle: styles.header,
        headerBackground: () => (
          <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          />
        ),
        headerTitle: () => <HeaderTitle />,
        headerTitleAlign: 'center',
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerTintColor: Colors.text,
      }}
    >
      <Tabs.Screen
        name="(recipes)"
        options={{
          title: t('recipes'),
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
          headerShown: false,
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
        name="favorites"
        options={{
          title: t('favorites'),
          tabBarIcon: ({ color }) => <Star size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
  header: {
    backgroundColor: Colors.background,
    elevation: 200,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerGradient: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: 12,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  fridgyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  headerSide: {
    marginTop: 12,
  }
});