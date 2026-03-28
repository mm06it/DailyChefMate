import { Search, X } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import Colors from "@/constants/colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }: SearchBarProps) {
  const handleClear = () => {
    onChangeText("");
  };

  return (
    <View style={styles.container}>
      <Search size={20} color={Colors.textLight} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        returnKeyType="search"
        clearButtonMode="never"
        testID="search-input"
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} style={styles.clearButton} testID="clear-search">
          <X size={18} color={Colors.textLight} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 6,
    backgroundColor: Colors.border,
    borderRadius: 12,
  },
});