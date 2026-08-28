import { useAuthActions } from '@convex-dev/auth/react';
import createContextHook from '@nkzw/create-context-hook';
import { useConvexAuth, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';

import { api } from '@/convex/_generated/api';

// TEMP: skips the login screen for local development. Set back to false to re-enable auth.
const DEV_SKIP_AUTH = true;

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata: Record<string, unknown>;
}

const MOCK_USER: AuthUser = {
  id: 'dev-mock-user',
  email: 'dev@local.test',
  created_at: new Date().toISOString(),
  user_metadata: {},
};

type AuthResult = { data: unknown; error: { message: string } | null };

export const [AuthProvider, useAuth] = createContextHook(() => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  // "skip" avoids querying before Convex Auth has resolved a session.
  const me = useQuery(api.users.current, isAuthenticated ? {} : 'skip');

  const realUser = useMemo<AuthUser | null>(() => {
    if (!me) return null;
    return {
      id: me._id,
      email: me.email ?? '',
      created_at: new Date(me._creationTime).toISOString(),
      user_metadata: {},
    };
  }, [me]);

  const realLoading = isLoading || (isAuthenticated && me === undefined);

  const signUp = useCallback(async (email: string, password: string, username?: string): Promise<AuthResult> => {
    try {
      await convexSignIn('password', { email, password, username, flow: 'signUp' });
      return { data: {}, error: null };
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Registrierung fehlgeschlagen' } };
    }
  }, [convexSignIn]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      await convexSignIn('password', { email, password, flow: 'signIn' });
      return { data: {}, error: null };
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen' } };
    }
  }, [convexSignIn]);

  // Not wired up to any real OAuth provider yet — add Google/Apple in
  // convex/auth.ts (providers array) and update these when needed.
  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    return { data: null, error: { message: 'Google-Anmeldung ist noch nicht konfiguriert.' } };
  }, []);

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    return { data: null, error: { message: 'Apple-Anmeldung ist noch nicht konfiguriert.' } };
  }, []);

  const signOut = useCallback(async () => {
    await convexSignOut();
    return { error: null };
  }, [convexSignOut]);

  return useMemo(() => ({
    user: DEV_SKIP_AUTH ? MOCK_USER : realUser,
    loading: DEV_SKIP_AUTH ? false : realLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
  }), [realUser, realLoading, signUp, signIn, signInWithGoogle, signInWithApple, signOut]);
});
