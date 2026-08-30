import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";

import { DailyChefMateContext } from "@/hooks/use-dailychefmate-store";
import { LanguageContext } from "@/hooks/use-language";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useIsDesktop } from "@/hooks/use-responsive";
import { trpc, trpcClient } from "@/lib/trpc";
import { convex } from "@/lib/convex";
import { secureStorage } from "@/lib/auth-storage";
import DesktopSidebar from "@/components/DesktopSidebar";
import AuthScreen from "./auth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const isDesktop = useIsDesktop();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const stack = (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipe-detail" options={{ title: "Recipe" }} />
      <Stack.Screen name="generated-recipes" options={{ title: "Generated Recipes" }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopShell}>
        <DesktopSidebar />
        <View style={styles.desktopContent}>{stack}</View>
      </View>
    );
  }

  return stack;
}

const styles = StyleSheet.create({
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopContent: {
    flex: 1,
    minWidth: 0,
  },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <ConvexAuthProvider client={convex} storage={Platform.OS === "web" ? undefined : secureStorage}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <LanguageContext>
              <AuthProvider>
                <DailyChefMateContext>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </DailyChefMateContext>
              </AuthProvider>
            </LanguageContext>
          </QueryClientProvider>
        </trpc.Provider>
      </ConvexAuthProvider>
      {/* Vercel Web Analytics + Speed Insights — web only; these touch
          `document`, which doesn't exist on native. */}
      {Platform.OS === "web" && <Analytics />}
      {Platform.OS === "web" && <SpeedInsights />}
    </>
  );
}