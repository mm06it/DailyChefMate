import * as SecureStore from "expo-secure-store";

// AsyncStorage key holding the username a user picked on the sign-up form.
// The username is no longer set during sign-up itself (convex/auth.ts); it is
// claimed via users.updateUsername once the session is active — see the reader
// in app/_layout.tsx.
export const PENDING_USERNAME_KEY = "dcm.pendingUsername";

// Storage adapter for ConvexAuthProvider on native (web uses its own default
// localStorage-backed storage). See @convex-dev/auth's React Native guide.
export const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};
