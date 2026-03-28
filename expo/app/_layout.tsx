import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";

import { FridgyContext } from "@/hooks/use-fridgy-store";
import { LanguageContext } from "@/hooks/use-language";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { trpc, trpcClient } from "@/lib/trpc";
import AuthScreen from "./auth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();

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

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="recipe-detail" options={{ title: "Recipe" }} />
      <Stack.Screen name="generated-recipes" options={{ title: "Generated Recipes" }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LanguageContext>
          <AuthProvider>
            <FridgyContext>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </FridgyContext>
          </AuthProvider>
        </LanguageContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}