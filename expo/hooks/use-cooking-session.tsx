import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

// One in-progress cooking session at a time, persisted on-device so it survives
// leaving the recipe screen and an app reload. Cleared on "Fertig gekocht" or
// "Kochen abbrechen". Not synced across devices (by design — local only).
const KEY = "dcm.cookingSession.v1";

export interface CookingSession {
  recipeId: string;
  recipeName: string;
  steps: string[];
  completed: boolean[];
  startedAt: number;
}

function isValid(s: unknown): s is CookingSession {
  const c = s as CookingSession | null;
  return (
    !!c &&
    typeof c.recipeId === "string" &&
    Array.isArray(c.steps) &&
    Array.isArray(c.completed) &&
    c.steps.length > 0 &&
    c.steps.length === c.completed.length
  );
}

export const [CookingSessionProvider, useCookingSession] = createContextHook(() => {
  const [session, setSession] = useState<CookingSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (isValid(parsed)) setSession(parsed);
          } catch {
            /* corrupt — ignore */
          }
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const write = useCallback((next: CookingSession | null) => {
    setSession(next);
    if (next) AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const start = useCallback(
    (recipe: { id: string; name: string; steps: string[] }) => {
      if (!recipe.steps.length) return;
      write({
        recipeId: recipe.id,
        recipeName: recipe.name,
        steps: recipe.steps,
        completed: new Array(recipe.steps.length).fill(false),
        startedAt: Date.now(),
      });
    },
    [write],
  );

  const setCompleted = useCallback(
    (completed: boolean[]) => {
      setSession((prev) => {
        if (!prev || completed.length !== prev.steps.length) return prev;
        const next = { ...prev, completed };
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  // Mark the first not-yet-done step done. Returns whether that was the last one.
  const advance = useCallback(() => {
    let wasLast = false;
    setSession((prev) => {
      if (!prev) return prev;
      const i = prev.completed.findIndex((c) => !c);
      if (i === -1) return prev;
      const completed = prev.completed.slice();
      completed[i] = true;
      wasLast = completed.every(Boolean);
      const next = { ...prev, completed };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    return wasLast;
  }, []);

  const stop = useCallback(() => write(null), [write]);

  return { session, hydrated, start, setCompleted, advance, stop };
});
