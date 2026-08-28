import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "[convex] EXPO_PUBLIC_CONVEX_URL is not set — copy the URL from `npx convex dev` into your .env file."
  );
}

// Falls back to a syntactically-valid placeholder so the app doesn't crash
// on import before EXPO_PUBLIC_CONVEX_URL is configured — requests will just
// fail until the real URL from `npx convex dev` is set.
export const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud", {
  unsavedChangesWarning: false,
});
