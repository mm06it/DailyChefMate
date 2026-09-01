import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ButtonProps;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="h3" center>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="secondary" center style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button {...action} />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: t.space[10],
      paddingHorizontal: t.space[6],
      gap: t.space[3],
    },
    icon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.surfaceSunken,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[2],
    },
    desc: { maxWidth: 320 },
    action: { marginTop: t.space[4] },
  });

export default EmptyState;
