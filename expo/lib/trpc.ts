import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  try {
    if (process.env.EXPO_PUBLIC_API_BASE_URL) {
      return process.env.EXPO_PUBLIC_API_BASE_URL;
    }

    if (typeof window !== "undefined" && typeof window.location !== "undefined") {
      console.log("[trpc] Using window.location.origin as base URL:", window.location.origin);
      return window.location.origin;
    }

    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri ?? (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      const guessed = `http://${host}:8081`;
      console.log("[trpc] Using guessed dev host base URL:", guessed);
      return guessed;
    }
  } catch (e) {
    console.log("[trpc] Failed to derive base URL, falling back to localhost: ", e);
  }

  const fallback = Platform.OS === "web" ? "http://localhost:3000" : "http://localhost:3000";
  console.warn("[trpc] Falling back to", fallback, "— set EXPO_PUBLIC_API_BASE_URL to avoid this.");
  return fallback;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});