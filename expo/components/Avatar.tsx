import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

// Deterministic initials avatar — no image upload / file storage.
const PALETTE = [
  "#FF6B6B", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  initials?: string;
  size?: number;
}

export default function Avatar({ name, initials, size = 40 }: AvatarProps) {
  const { bg, text } = useMemo(() => {
    const key = (name || "?").trim().toLowerCase();
    return { bg: PALETTE[hash(key) % PALETTE.length], text: initials || initialsOf(name || "?") };
  }, [name, initials]);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { color: "#FFFFFF", fontWeight: "700" },
});
