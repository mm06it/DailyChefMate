import { useFocusEffect } from "expo-router";
import { Star } from "lucide-react-native";
import React, { useCallback } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import CollapsingTabHeader, {
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import RecipeCard from "@/components/RecipeCard";
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useFavoriteRecipes } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";
import { EmptyState } from "@/components/ui/EmptyState";
import { Recipe } from "@/types/recipe";

export default function FavoritesScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const favoriteRecipes = useLocalizedRecipes(useFavoriteRecipes());
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();

  useFocusEffect(useCallback(() => resetHeader(), []));

  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={columns > 1 ? { width: itemWidth } : undefined}>
      <RecipeCard recipe={item} />
    </View>
  );

  const gridMax = isDesktop
    ? { maxWidth: theme.layout.containerWide, alignSelf: "center" as const, width: "100%" as const }
    : null;

  return (
    <View style={styles.container}>
      {!isDesktop && <CollapsingTabHeader />}

      {favoriteRecipes.length > 0 ? (
        <FlatList
          key={columns}
          data={favoriteRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={[
            styles.listContent,
            gridMax,
            !isDesktop && { paddingTop: topPad + 16 },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={isDesktop ? undefined : onHeaderScroll}
          scrollEventThrottle={16}
          testID="favorites-list"
        />
      ) : (
        <View style={[styles.emptyContainer, !isDesktop && { paddingTop: topPad }]}>
          <EmptyState
            icon={<Star size={24} color={theme.textMuted} />}
            title={t('noFavorites')}
          />
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    listContent: {
      padding: t.space[5],
    },
    gridRow: {
      gap: t.space[5],
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });
