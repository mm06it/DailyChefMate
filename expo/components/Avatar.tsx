import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AVATAR_COLORS } from "@/constants/avatar";

// Deterministic initials avatar — no image upload / file storage. Users can
// override the background colour and swap the initials for an emoji in
// Settings (stored on the user doc, flows through miniProfile).
const PALETTE = AVATAR_COLORS;

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
  /** User-chosen background colour; falls back to a hash of `name`. */
  color?: string;
  /** User-chosen emoji shown instead of initials. */
  emoji?: string;
}

export default function Avatar({ name, initials, size = 40, color, emoji }: AvatarProps) {
  const { bg, text } = useMemo(() => {
    const key = (name || "?").trim().toLowerCase();
    return {
      bg: color || PALETTE[hash(key) % PALETTE.length],
      text: initials || initialsOf(name || "?"),
    };
  }, [name, initials, color]);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.4 }]}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { color: "#FFFFFF", fontWeight: "700" },
});
