import { Search, X } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Search size={18} color={theme.textMuted} style={styles.icon} />
      <TextInput
        style={[styles.input, Platform.OS === "web" && webNoOutline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        returnKeyType="search"
        clearButtonMode="never"
        testID="search-input"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")} style={styles.clearButton} testID="clear-search">
          <X size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const webNoOutline = { outlineStyle: "none" } as unknown as { [k: string]: string };

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space[4],
      paddingVertical: 10,
      flex: 1,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
    },
    icon: { marginRight: t.space[3] },
    input: {
      flex: 1,
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.textPrimary,
      padding: 0,
    },
    clearButton: {
      padding: 4,
      marginLeft: t.space[2],
    },
  });
