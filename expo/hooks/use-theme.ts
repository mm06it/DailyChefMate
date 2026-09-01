import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { makeTheme, type Scheme, type Theme } from "@/constants/theme";

export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "dailychefmate_theme";

function isMode(v: unknown): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

export const [ThemeContext, useTheme] = createContextHook(() => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMode(stored)) setModeState(stored);
      } catch {
        /* storage unavailable — keep the default */
      }
    })();
  }, []);

  const scheme: Scheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const theme: Theme = useMemo(() => makeTheme(scheme), [scheme]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      /* best effort */
    });
  };

  return { theme, mode, scheme, setMode };
});
