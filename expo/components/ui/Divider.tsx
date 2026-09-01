import { StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

export interface DividerProps {
  /** Left/right inset (spacing index). */
  inset?: number;
  vertical?: boolean;
  spacing?: number;
}

const SP: Record<number, number> = { 0: 0, 3: 8, 4: 12, 5: 16, 6: 20 };

export function Divider({ inset = 0, vertical = false, spacing }: DividerProps) {
  const styles = useThemedStyles(makeStyles);
  if (vertical) {
    return <View style={[styles.v, spacing != null && { marginHorizontal: SP[spacing] ?? spacing }]} />;
  }
  return (
    <View
      style={[
        styles.h,
        inset ? { marginHorizontal: SP[inset] ?? inset } : null,
        spacing != null ? { marginVertical: SP[spacing] ?? spacing } : null,
      ]}
    />
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    h: { height: t.borderWidth.hairline, backgroundColor: t.border, alignSelf: "stretch" },
    v: { width: t.borderWidth.hairline, backgroundColor: t.border, alignSelf: "stretch" },
  });

export default Divider;
