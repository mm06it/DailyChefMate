import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";

// Opt-in Fitness Mode (Settings toggle). When on: nutrition on recipe cards +
// detail, fitness filters in the Rezepte tab, high-protein-first generation.
// Persisted per device, same pattern as use-theme.ts.

const FITNESS_MODE_KEY = "dailychefmate_fitness_mode";

export const [FitnessModeContext, useFitnessMode] = createContextHook(() => {
  const [enabled, setEnabledState] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FITNESS_MODE_KEY);
        if (stored === "1") setEnabledState(true);
      } catch {
        /* storage unavailable — keep the default */
      }
    })();
  }, []);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);
    AsyncStorage.setItem(FITNESS_MODE_KEY, next ? "1" : "0").catch(() => {
      /* best effort */
    });
  };

  return { enabled, setEnabled };
});
