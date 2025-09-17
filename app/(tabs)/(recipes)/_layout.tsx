import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { useLanguage } from '@/hooks/use-language';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AccountMenu } from '@/components/AccountMenu';
import Colors from '@/constants/colors';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext(Navigator);

const HeaderTitle = () => (
  <View style={styles.headerContainer}>
    <Image 
      source={{ uri: 'https://r2-pub.rork.com/attachments/mfxb024l2x0j1masip1hg' }}
      style={styles.logo}
    />
    <Text style={styles.fridgyTitle}>Fridgy</Text>
  </View>
);

export default function RecipesLayout() {
  const { t } = useLanguage();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LanguageSelector />
        <HeaderTitle />
        <AccountMenu />
      </View>
      <MaterialTopTabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarIndicatorStyle: {
            backgroundColor: Colors.primary,
            height: 4,
            borderRadius: 999,
            marginHorizontal: 18,
          },
          tabBarStyle: {
            backgroundColor: Colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
});