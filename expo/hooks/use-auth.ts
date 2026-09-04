import { useAuthActions } from '@convex-dev/auth/react';
import createContextHook from '@nkzw/create-context-hook';
import { useConvexAuth, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';

import { api } from '@/convex/_generated/api';
import { errorCode } from '@/lib/error-code';

// TEMP: skips the login screen for local development. Set back to false to re-enable auth.
const DEV_SKIP_AUTH = false;

interface AuthUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  user_metadata: { provider?: string };
}

const MOCK_USER: AuthUser = {
  id: 'dev-mock-user',
  email: 'dev@local.test',
  username: 'dev',
  created_at: new Date().toISOString(),
  user_metadata: {},
};

type AuthResult = {
  data: unknown;
  error: { message: string } | null;
  // true when the credentials were accepted but no session was issued yet
  // because an email verification code was sent and is awaited.
  pendingVerification?: boolean;
};

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
      username: me.username ?? '',
      created_at: new Date(me._creationTime).toISOString(),
      user_metadata: {},
    };
  }, [me]);

  const realLoading = isLoading || (isAuthenticated && me === undefined);

  const signUp = useCallback(async (email: string, password: string, username?: string): Promise<AuthResult> => {
    try {
      const { signingIn } = await convexSignIn('password', {
        email,
        password,
        flow: 'signUp',
        ...(username ? { username } : {}),
      });
      return { data: {}, error: null, pendingVerification: !signingIn };
    } catch (e) {
      return { data: null, error: { message: errorCode(e) || 'Registrierung fehlgeschlagen' } };
    }
  }, [convexSignIn]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { signingIn } = await convexSignIn('password', { email, password, flow: 'signIn' });
      return { data: {}, error: null, pendingVerification: !signingIn };
    } catch (e) {
      return { data: null, error: { message: errorCode(e) || 'Anmeldung fehlgeschlagen' } };
    }
  }, [convexSignIn]);

  // Submit the 6-digit code from the verification email. On success Convex
  // Auth issues a session and `isAuthenticated` flips to true.
  const verifyEmail = useCallback(async (email: string, code: string): Promise<AuthResult> => {
    try {
      await convexSignIn('password', { email, code, flow: 'email-verification' });
      return { data: {}, error: null };
    } catch (e) {
      return { data: null, error: { message: errorCode(e) || 'Der Code ist ungültig oder abgelaufen.' } };
    }
  }, [convexSignIn]);

  // Re-send the code. For an unverified account, a normal password sign-in
  // re-triggers the verify provider instead of issuing a session.
  const resendVerificationCode = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      await convexSignIn('password', { email, password, flow: 'signIn' });
      return { data: {}, error: null };
    } catch (e) {
      return { data: null, error: { message: errorCode(e) || 'Der Code konnte nicht erneut gesendet werden.' } };
    }
  }, [convexSignIn]);

  // OAuth (Google/Apple) is not wired up — add providers in convex/auth.ts
  // and surface real sign-in methods here when needed.

  const signOut = useCallback(async () => {
    await convexSignOut();
    return { error: null };
  }, [convexSignOut]);

  return useMemo(() => ({
    user: DEV_SKIP_AUTH ? MOCK_USER : realUser,
    loading: DEV_SKIP_AUTH ? false : realLoading,
    signUp,
    signIn,
    verifyEmail,
    resendVerificationCode,
    signOut,
  }), [realUser, realLoading, signUp, signIn, verifyEmail, resendVerificationCode, signOut]);
});
