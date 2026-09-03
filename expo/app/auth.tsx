import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { X as XIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConvex } from 'convex/react';

import { useAuth } from '@/hooks/use-auth';
import { PENDING_USERNAME_KEY } from '@/lib/auth-storage';
import { useLanguage } from '@/hooks/use-language';
import { useIsDesktop } from '@/hooks/use-responsive';
import { getTranslation } from '@/constants/translations';
import type { Theme } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/convex/_generated/api';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';

const USERNAME_CHECK_ENABLED = false as const;

interface AuthScreenProps {
  // Rendered inside the login overlay (see components/AuthGateModal.tsx) rather
  // than as the whole app. Adds a close button and drops the pull-to-reload.
  embedded?: boolean;
  onClose?: () => void;
}

export default function AuthScreen({ embedded = false, onClose }: AuthScreenProps = {}) {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [, setUsernameAvailable] = useState<boolean | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // When set, the email-verification step is shown instead of the form.
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const { signIn, signUp, verifyEmail, resendVerificationCode } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const isDesktop = useIsDesktop();

  const scrollRef = useRef<ScrollView>(null);

  const reloadApp = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
  }, []);

  useEffect(() => {
    if (embedded || Platform.OS !== 'web' || isDesktop) return;
    const node: HTMLElement | undefined = (scrollRef.current as any)?.getScrollableNode?.();
    if (!node) return;

    let wheelAccum = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let touchStartY = 0;
    let pulling = false;
    const atTop = () => node.scrollTop <= 0;

    const onWheel = (e: WheelEvent) => {
      if (!atTop() || e.deltaY >= 0) { wheelAccum = 0; return; }
      wheelAccum += -e.deltaY;
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelAccum = 0; }, 300);
      if (wheelAccum > 220) { wheelAccum = 0; reloadApp(); }
    };
    const onTouchStart = (e: TouchEvent) => {
      pulling = atTop();
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = (e.touches[0]?.clientY ?? 0) - touchStartY;
      if (dy > 90) { pulling = false; reloadApp(); }
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [reloadApp, isDesktop, embedded]);
  const convex = useConvex();

  const isEmailRegistered = useCallback(async (value: string): Promise<boolean | null> => {
    try {
      return await convex.mutation(api.users.emailRegistered, { email: value.trim() });
    } catch (e) {
      console.log('emailRegistered check failed', e);
      return null;
    }
  }, [convex]);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  const checkUsername = useCallback(async (_name: string) => { return; }, []);

  useEffect(() => {
    if (!USERNAME_CHECK_ENABLED) return;
    const validPattern = /^[a-z0-9_-]{3,20}$/;
    if (normalizedUsername.length === 0) { setUsernameAvailable(null); return; }
    if (!validPattern.test(normalizedUsername)) { setUsernameAvailable(false); return; }
    const id = setTimeout(() => {
      checkUsername(normalizedUsername).catch((e) => console.log('Username check error', e));
    }, 400);
    return () => clearTimeout(id);
  }, [normalizedUsername, checkUsername]);

  const tr = (key: string) => getTranslation(language, key);

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setGeneralError(null);
  };

  const looksLikeBackendError = (msg: string) => {
    const m = msg.toLowerCase();
    return (
      m.includes('environment variable') ||
      m.includes('not configured') ||
      m.includes('resend') ||
      m.includes('network') ||
      m.includes('failed to fetch')
    );
  };

  const handleEmailAuth = async () => {
    clearErrors();

    const trimmedEmail = email.trim();
    let hasFieldError = false;
    if (!trimmedEmail) {
      setEmailError(tr('emailRequired') ?? 'Bitte E-Mail-Adresse eingeben');
      hasFieldError = true;
    }
    if (!password.trim()) {
      setPasswordError(tr('passwordRequired') ?? 'Bitte Passwort eingeben');
      hasFieldError = true;
    }
    if (hasFieldError) return;

    if (!validateEmail(email)) {
      setEmailError(tr('invalidEmail') ?? 'Ungültige E-Mail-Adresse');
      return;
    }

    if (password.length < 8) {
      setPasswordError(tr('passwordTooShort') ?? 'Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setConfirmPasswordError(tr('passwordsDoNotMatch') ?? 'Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if ((await isEmailRegistered(trimmedEmail)) === true) {
          setEmailError(tr('emailAlreadyRegistered') ?? 'Für diese E-Mail-Adresse gibt es bereits ein Konto');
          return;
        }

        if (normalizedUsername) {
          await AsyncStorage.setItem(PENDING_USERNAME_KEY, normalizedUsername).catch(() => {});
        }
        const { error, pendingVerification } = await signUp(trimmedEmail, password);
        if (error) {
          const msg = String((error as any)?.message ?? '');
          if (/already (exists|registered)/i.test(msg)) {
            setEmailError(tr('emailAlreadyRegistered') ?? 'Für diese E-Mail-Adresse gibt es bereits ein Konto');
          } else if (/password/i.test(msg)) {
            setPasswordError(tr('passwordTooShort') ?? 'Passwort muss mindestens 8 Zeichen lang sein');
          } else {
            console.error('Sign up error:', msg);
            setGeneralError(tr('authFailedRetry') ?? 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.');
          }
        } else if (pendingVerification) {
          setCode('');
          setCodeError(null);
          setVerificationEmail(trimmedEmail);
        } else {
          showToast(tr('signUpSuccess') ?? 'Erfolgreich registriert!', { variant: 'success' });
          setIsSignUp(false);
        }
      } else {
        const { error, pendingVerification } = await signIn(trimmedEmail, password);
        if (error) {
          const msg = String((error as any)?.message ?? '');
          if (looksLikeBackendError(msg)) {
            console.error('Sign in error:', msg);
            setGeneralError(tr('authFailedRetry') ?? 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.');
          } else {
            const registered = await isEmailRegistered(trimmedEmail);
            if (registered === false) {
              setEmailError(tr('emailNotRegistered') ?? 'Diese E-Mail-Adresse ist nicht registriert');
            } else {
              setPasswordError(tr('wrongPassword') ?? 'Passwort ist falsch');
            }
          }
        } else if (pendingVerification) {
          setCode('');
          setCodeError(null);
          setVerificationEmail(trimmedEmail);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setGeneralError(tr('authFailedRetry') ?? 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationEmail) return;
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setCodeError(getTranslation(language, 'codeInvalid') ?? 'Der Code ist ungültig oder abgelaufen');
      return;
    }
    setVerifying(true);
    setCodeError(null);
    try {
      const { error } = await verifyEmail(verificationEmail, trimmed);
      if (error) {
        setCodeError((error as any)?.message || (getTranslation(language, 'codeInvalid') ?? 'Der Code ist ungültig oder abgelaufen'));
      }
    } catch (err) {
      console.error('Verify code error:', err);
      setCodeError(getTranslation(language, 'codeInvalid') ?? 'Der Code ist ungültig oder abgelaufen');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) return;
    setCodeError(null);
    const { error } = await resendVerificationCode(verificationEmail, password);
    if (error) {
      setCodeError((error as any)?.message || 'Der Code konnte nicht erneut gesendet werden.');
    } else {
      showToast(getTranslation(language, 'codeResent') ?? 'Neuer Code wurde gesendet', { variant: 'success' });
    }
  };

  const handleBackFromVerify = () => {
    setVerificationEmail(null);
    setCode('');
    setCodeError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
          <View style={styles.column}>
            <View style={styles.topBar} pointerEvents="box-none">
              {embedded && (
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={styles.closeSlot}
                  testID="auth-close"
                  accessibilityLabel={getTranslation(language, 'cancel')}
                >
                  <XIcon size={24} color={theme.textPrimary} />
                </Pressable>
              )}
              <Image
                source={require('@/assets/images/icon.png')}
                style={[styles.icon, isDesktop && styles.iconDesktop]}
                resizeMode="contain"
              />
              <View style={styles.langSlot}>
                <LanguageSelector />
              </View>
            </View>

            <Text variant="display" center style={styles.title}>
              {verificationEmail
                ? getTranslation(language, 'verifyEmailTitle')
                : getTranslation(language, 'welcome')}
            </Text>

            {verificationEmail ? (
              <View style={styles.form}>
                <Text variant="body" color="secondary" center>
                  {getTranslation(language, 'verifyEmailSubtitle')}
                </Text>
                <Text variant="title" center style={styles.verifyEmail}>
                  {verificationEmail}
                </Text>

                <Input
                  placeholder={getTranslation(language, 'enterCode')}
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/[^0-9]/g, '').slice(0, 6));
                    setCodeError(null);
                  }}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  editable={!verifying}
                  onSubmitEditing={handleVerifyCode}
                  returnKeyType="done"
                  error={codeError ?? undefined}
                  style={styles.codeInput}
                  testID="auth-code-input"
                />

                <Button
                  label={getTranslation(language, 'confirmCode')}
                  fullWidth
                  loading={verifying}
                  onPress={handleVerifyCode}
                  testID="auth-verify-button"
                />

                <Button label={getTranslation(language, 'resendCode')} variant="ghost" fullWidth onPress={handleResendCode} testID="auth-resend-code" />
                <Button label={getTranslation(language, 'backToLogin')} variant="ghost" fullWidth onPress={handleBackFromVerify} testID="auth-verify-back" />
              </View>
            ) : (
              <View style={styles.form}>
                {isSignUp && (
                  <Input
                    label={getTranslation(language, 'usernameOptionalHint')}
                    placeholder={getTranslation(language, 'enterUsername')}
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      setUsernameAvailable(null);
                    }}
                    autoCapitalize="none"
                    autoComplete="username"
                    returnKeyType="go"
                    onSubmitEditing={handleEmailAuth}
                    testID="auth-username-input"
                  />
                )}

                <Input
                  placeholder={getTranslation(language, 'enterEmail')}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setEmailError(null);
                    setGeneralError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="go"
                  onSubmitEditing={handleEmailAuth}
                  error={emailError ?? undefined}
                  testID="auth-email-input"
                />

                <Input
                  placeholder={getTranslation(language, 'enterPassword')}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError(null);
                    setGeneralError(null);
                  }}
                  secureTextEntry
                  autoComplete="password"
                  returnKeyType="go"
                  onSubmitEditing={handleEmailAuth}
                  error={passwordError ?? undefined}
                  testID="auth-password-input"
                />

                {isSignUp && (
                  <Input
                    placeholder={getTranslation(language, 'confirmPassword')}
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setConfirmPasswordError(null);
                    }}
                    secureTextEntry
                    autoComplete="password"
                    returnKeyType="go"
                    onSubmitEditing={handleEmailAuth}
                    error={confirmPasswordError ?? undefined}
                    testID="auth-confirm-password-input"
                  />
                )}

                {!!generalError && (
                  <Text variant="caption" color="danger" center testID="auth-general-error">
                    {generalError}
                  </Text>
                )}

                <Button
                  label={isSignUp ? getTranslation(language, 'createAccount') : getTranslation(language, 'signIn')}
                  fullWidth
                  loading={loading}
                  onPress={handleEmailAuth}
                  testID="auth-submit-button"
                />

                <Button
                  label={
                    isSignUp
                      ? getTranslation(language, 'alreadyHaveAccount')
                      : getTranslation(language, 'dontHaveAccount')
                  }
                  variant="ghost"
                  fullWidth
                  onPress={() => setIsSignUp(!isSignUp)}
                  testID="auth-toggle-signup"
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bgSubtle },
    keyboardView: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: t.space[6],
    },
    column: {
      width: '100%',
      maxWidth: t.layout.containerNarrow,
      alignSelf: 'center',
    },
    topBar: {
      alignItems: 'center',
      marginBottom: t.space[7],
    },
    langSlot: { position: 'absolute', top: 0, right: 0 },
    closeSlot: { position: 'absolute', top: 0, left: 0, padding: 4 },
    icon: { width: 72, height: 72 },
    iconDesktop: { width: 88, height: 88 },
    title: { marginBottom: t.space[8] },
    form: { width: '100%', gap: t.space[4] },
    verifyEmail: { marginBottom: t.space[3] },
    codeInput: { textAlign: 'center', letterSpacing: 4, fontSize: 18 },
  });
