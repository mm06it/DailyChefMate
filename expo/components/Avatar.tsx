import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AVATAR_COLORS } from "@/constants/avatar";
import { useTheme } from "@/hooks/use-theme";

// Deterministic initials avatar — no image upload / file storage. Users can
// override the background colour and swap the initials for an emoji in
// Settings (stored on the user doc, flows through miniProfile).
// The auto (name-hash) fallback only uses the solid colours — "transparent"
// is opt-in only.
const PALETTE = AVATAR_COLORS.filter((c) => c !== "transparent");

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Perceived luminance — used to flip the text/emoji contrast when the user
// picks a light background (white / transparent).
function isLightBg(color: string): boolean {
  if (color === "transparent") return true;
  const h = color.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
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
  /** User-chosen background colour (hex or "transparent"); falls back to a hash of `name`. */
  color?: string;
  /** User-chosen emoji shown instead of initials. */
  emoji?: string;
}

export default function Avatar({ name, initials, size = 40, color, emoji }: AvatarProps) {
  const { theme } = useTheme();
  const { bg, text, light } = useMemo(() => {
    const key = (name || "?").trim().toLowerCase();
    const chosen = color || PALETTE[hash(key) % PALETTE.length];
    return {
      bg: chosen === "transparent" ? "transparent" : chosen,
      text: initials || initialsOf(name || "?"),
      light: isLightBg(chosen),
    };
  }, [name, initials, color]);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        light && { borderWidth: 1, borderColor: theme.border },
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontFamily: theme.font.bodyBold,
              fontSize: size * 0.4,
              color: light ? theme.textPrimary : "#FFFFFF",
            },
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
});
