import { StyleSheet } from "react-native";

// Theme-independent structural styles that show up on nearly every screen.
// Compose with a themed style: style={[layout.rowBetween, styles.header]}.
export const layout = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowStart: { flexDirection: "row", alignItems: "flex-start" },
  center: { alignItems: "center", justifyContent: "center" },
  wrap: { flexWrap: "wrap" },
});
