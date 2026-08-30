import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/hooks/use-language";

export default function NotFoundScreen() {
  const { t } = useLanguage();
  return (
    <>
      <Stack.Screen options={{ title: t('oops') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('screenNotFound')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('goHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: "#2e78b7",
  },
});
