import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

// The app is browsable without an account. When an anonymous user taps an
// action that needs a session (favorite, add to plan, add friend, generate,
// create recipe, rate, mark cooked…), `requireAuth` defers that action and
// pops the login overlay (rendered by <AuthGateModal/>). Once the session
// lands, the deferred action runs and the overlay closes — the user never
// leaves the screen they were on.
export const [AuthGateProvider, useAuthGate] = createContextHook(() => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const pending = useRef<null | (() => void | Promise<void>)>(null);

  useEffect(() => {
    if (!user) return;
    if (!visible && !pending.current) return;
    const run = pending.current;
    pending.current = null;
    setVisible(false);
    // Give the overlay a frame to dismiss before the action fires (some open
    // their own modal).
    setTimeout(() => run?.(), 0);
  }, [user, visible]);

  const requireAuth = useCallback(
    (run: () => void | Promise<void>): boolean => {
      if (user) {
        run();
        return true;
      }
      pending.current = run;
      setVisible(true);
      return false;
    },
    [user],
  );

  const closeGate = useCallback(() => {
    pending.current = null;
    setVisible(false);
  }, []);

  return { visible, requireAuth, closeGate };
});

// Convenience: most call sites only need the guard function.
export function useRequireAuth() {
  return useAuthGate().requireAuth;
}
