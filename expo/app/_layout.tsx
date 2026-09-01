import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useMutation } from "convex/react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";

import MaintenanceScreen from "@/components/MaintenanceScreen";

import { DailyChefMateContext } from "@/hooks/use-dailychefmate-store";
import { MealPlanContext } from "@/hooks/use-meal-plan";
import { SocialContext } from "@/hooks/use-social";
import { RatingsContext } from "@/hooks/use-ratings";
import { ToastProvider } from "@/components/Toast";
import { LanguageContext, useLanguage } from "@/hooks/use-language";
import { ThemeContext, useTheme } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useIsDesktop } from "@/hooks/use-responsive";
import { api } from "@/convex/_generated/api";
import { convex } from "@/lib/convex";
import { secureStorage, PENDING_USERNAME_KEY } from "@/lib/auth-storage";
import DesktopSidebar from "@/components/DesktopSidebar";
import AuthScreen from "./auth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Web: paint the page background from the saved theme choice as early as the
// bundle executes, so a hard reload doesn't flash white before React mounts.
// (`web.output` is "single", so app/+html.tsx isn't applied — this is the hook.)
if (Platform.OS === "web" && typeof document !== "undefined") {
  try {
    const stored = window.localStorage.getItem("dailychefmate_theme");
    const mode = stored === "light" || stored === "dark" ? stored : "system";
    const dark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const bg = dark ? "#121110" : "#FFFFFF";
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    (document.documentElement.style as any).colorScheme = dark ? "dark" : "light";
  } catch {
    /* SSR / storage blocked — ignore */
  }
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const isDesktop = useIsDesktop();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const claimUsername = useMutation(api.users.updateUsername);

  // If the app shell has loaded but auth/backend hasn't resolved after a while,
  // the backend (Convex) is likely unreachable — show a maintenance screen
  // instead of an endless spinner.
  const [tooSlow, setTooSlow] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  useEffect(() => {
    if (!loading) {
      setTooSlow(false);
      return;
    }
    setTooSlow(false);
    const id = setTimeout(() => setTooSlow(true), 12000);
    return () => clearTimeout(id);
  }, [loading, retryNonce]);

  const handleRetry = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
    } else {
      // Native has no full reload — restart the wait so the spinner (and, if
      // still unreachable, the maintenance screen) comes back.
      setRetryNonce((n) => n + 1);
    }
  };

  // A username picked on the sign-up form is claimed here, once the session is
  // active, via the atomic users.updateUsername mutation (sign-up itself no
  // longer sets it — see convex/auth.ts). If it's taken/invalid the user sets
  // one in Settings; the profile tab shows a reminder while username is empty.
  useEffect(() => {
    if (!user || user.username) return;
    let cancelled = false;
    (async () => {
      try {
        const pending = await AsyncStorage.getItem(PENDING_USERNAME_KEY);
        if (!pending || cancelled) return;
        try {
          await claimUsername({ username: pending });
        } catch (e) {
          console.log("pending username claim failed", e);
        }
        await AsyncStorage.removeItem(PENDING_USERNAME_KEY);
      } catch {
        /* storage unavailable — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, claimUsername]);

  if (loading) {
    if (tooSlow) {
      return <MaintenanceScreen onRetry={handleRetry} />;
    }
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const stack = (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipe-detail" options={{ title: t('recipeDetail') }} />
      <Stack.Screen name="generated-recipes" options={{ title: t('generatedRecipesTitle') }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );

  if (isDesktop) {
    return (
      <View style={[styles.desktopShell, { backgroundColor: theme.bgSubtle }]}>
        <DesktopSidebar />
        <View style={[styles.desktopContent, { backgroundColor: theme.bg }]}>
          {stack}
        </View>
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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <ConvexAuthProvider client={convex} storage={Platform.OS === "web" ? undefined : secureStorage}>
        <ThemeContext>
          <LanguageContext>
            <ToastProvider>
              <AuthProvider>
                <DailyChefMateContext>
                  <MealPlanContext>
                    <SocialContext>
                      <RatingsContext>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <RootLayoutNav />
                        </GestureHandlerRootView>
                      </RatingsContext>
                    </SocialContext>
                  </MealPlanContext>
                </DailyChefMateContext>
              </AuthProvider>
            </ToastProvider>
          </LanguageContext>
        </ThemeContext>
      </ConvexAuthProvider>
      {/* Vercel Web Analytics + Speed Insights — web only; these touch
          `document`, which doesn't exist on native. */}
      {Platform.OS === "web" && <Analytics />}
      {Platform.OS === "web" && <SpeedInsights />}
    </>
  );
}