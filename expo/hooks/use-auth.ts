import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';

// Complete the auth session for web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// TEMP: skips the login screen for local development. Set back to false to re-enable auth.
const DEV_SKIP_AUTH = true;

const MOCK_USER = {
  id: 'dev-mock-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'dev@local.test',
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
} as User;

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(DEV_SKIP_AUTH ? MOCK_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!DEV_SKIP_AUTH);

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', { session: !!session, error });
      if (error) {
        console.error('Session error:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session: !!session });
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    try {
      const rawUsername = (username ?? '').trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: rawUsername.length > 0 ? { data: { username: rawUsername } } : undefined,
      } as any);

      if (error) {
        return { data, error };
      }

      const newUserId = data?.user?.id ?? null;
      if (newUserId && rawUsername.length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: newUserId, username: rawUsername }, { onConflict: 'id' });
        if (profileError) {
          return { data: null, error: { message: profileError.message } as any };
        }
      }

      return { data, error: null } as any;
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Unknown error' } as any };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // For all platforms, use Supabase's built-in OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? (typeof window !== 'undefined' ? window.location.origin : undefined)
            : 'exp://127.0.0.1:19000/--/auth/callback',
        },
      });
      return { data, error };
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        // For iOS, use native Apple Authentication
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          
          // Sign in with Supabase using the Apple credential
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken!,
          });
          
          return { data, error };
        } catch (appleError: any) {
          if (appleError.code === 'ERR_REQUEST_CANCELED') {
            return { data: null, error: { message: 'Apple Sign-In was cancelled' } };
          }
          throw appleError;
        }
      } else {
        // For web and Android, use Supabase's built-in OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: Platform.OS === 'web' 
              ? (typeof window !== 'undefined' ? window.location.origin : undefined)
              : 'exp://127.0.0.1:19000/--/auth/callback',
          },
        });
        return { data, error };
      }
    } catch (err) {
      console.error('Apple Sign-In Error:', err);
      return { data: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } };
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
  }), [user, session, loading, signUp, signIn, signInWithGoogle, signInWithApple, signOut]);
});