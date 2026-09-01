import { type ReactNode } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useIsDesktop } from "@/hooks/use-responsive";

type MaxWidth = "narrow" | "content" | "wide" | "full" | number;

export interface ScreenProps {
  children: ReactNode;
  /** Centered content column on desktop. Default "wide". "full" = no cap. */
  maxWidth?: MaxWidth;
  scroll?: boolean;
  /** Inner horizontal+vertical padding (spacing index). Default 5 (16). */
  padded?: boolean | number;
  edges?: Edge[];
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function resolveMaxWidth(mw: MaxWidth, t: Theme): number | undefined {
  if (mw === "full") return undefined;
  if (typeof mw === "number") return mw;
  if (mw === "narrow") return t.layout.containerNarrow;
  if (mw === "content") return t.layout.containerContent;
  return t.layout.containerWide;
}

const PAD: Record<number, number> = { 3: 8, 4: 12, 5: 16, 6: 20, 7: 24 };

export function Screen({
  children,
  maxWidth = "wide",
  scroll = false,
  padded = false,
  edges = ["top", "left", "right", "bottom"],
  onScroll,
  contentContainerStyle,
  style,
  testID,
}: ScreenProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDesktop = useIsDesktop();

  const cap = resolveMaxWidth(maxWidth, theme);
  const padValue = padded === true ? 16 : padded ? PAD[padded] ?? padded : 0;

  const column: StyleProp<ViewStyle> = [
    { width: "100%", flexGrow: 1 },
    isDesktop && cap ? { maxWidth: cap, alignSelf: "center" } : null,
    padValue ? { padding: padValue } : null,
    contentContainerStyle,
  ];

  const inner = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.scrollContent, column]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, column]}>{children}</View>
  );

  return (
    <SafeAreaView testID={testID} style={[styles.safe, style]} edges={edges}>
      {inner}
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    fill: { flex: 1, width: "100%" },
    scrollContent: { alignItems: "stretch" },
  });

export default Screen;
