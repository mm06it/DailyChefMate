import * as SecureStore from "expo-secure-store";

// Storage adapter for ConvexAuthProvider on native (web uses its own default
// localStorage-backed storage). See @convex-dev/auth's React Native guide.
export const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};
