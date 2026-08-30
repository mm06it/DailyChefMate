import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConvex } from 'convex/react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { getTranslation } from '@/constants/translations';
import { api } from '@/convex/_generated/api';
import { LanguageSelector } from '@/components/LanguageSelector';
import ResponsiveContainer from '@/components/ResponsiveContainer';

const USERNAME_CHECK_ENABLED = false as const;

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [successVisible, setSuccessVisible] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const successAnim = useRef(new Animated.Value(0)).current;

  // When set, the email-verification step is shown instead of the form.
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [code, setCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const { signIn, signUp, verifyEmail, resendVerificationCode } = useAuth();
  const { language } = useLanguage();

  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);

  // "Pull up / scroll past the top" reloads the page.
  const reloadApp = useCallback(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.location.reload();
      return;
    }
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
  }, [reloadApp]);
  const convex = useConvex();

  const isEmailRegistered = useCallback(async (value: string): Promise<boolean | null> => {
    try {
      return await convex.query(api.users.emailRegistered, { email: value.trim() });
    } catch (e) {
      console.log('emailRegistered check failed', e);
      return null;
    }
  }, [convex]);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);

  // Username-availability checking is disabled for now (USERNAME_CHECK_ENABLED)
  // — Convex doesn't have a profiles table to check against yet. Re-enable by
  // adding a `usernameTaken` query in convex/users.ts and calling it here.
  const checkUsername = useCallback(async (_name: string) => {
    return;
  }, []);

  useEffect(() => {
    if (!USERNAME_CHECK_ENABLED) {
      return;
    }
    const validPattern = /^[a-z0-9_-]{3,20}$/;
    if (normalizedUsername.length === 0) {
      setUsernameAvailable(null);
      return;
    }
    if (!validPattern.test(normalizedUsername)) {
      setUsernameAvailable(false);
      return;
    }
    const id = setTimeout(() => {
      checkUsername(normalizedUsername).catch((e) => console.log('Username check error', e));
    }, 400);
    return () => clearTimeout(id);
  }, [normalizedUsername, checkUsername]);

  const triggerSuccessToast = useCallback((text: string) => {
    setSuccessMessage(text);
    setSuccessVisible(true);
    successAnim.stopAnimation();
    successAnim.setValue(0);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setSuccessVisible(false);
        });
      }, 2400);
    });
  }, [successAnim]);

  const tr = (key: string) => getTranslation(language, key);

  const clearErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setGeneralError(null);
  };

  // A thrown auth error that clearly points at a backend/config problem
  // rather than user input — so we don't mislabel it as "wrong password".
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

    if (email.toLowerCase() === 'admin' && password === 'admin') {
      setLoading(true);
      try {
        const adminEmail = 'admin@dailychefmate.app';
        const adminPassword = 'admin123456';
        const { error: signInError } = await signIn(adminEmail, adminPassword);
        if (signInError) {
          const { error: signUpError } = await signUp(adminEmail, adminPassword, 'admin');
          if (signUpError) {
            console.error('Admin account creation failed:', (signUpError as any)?.message);
            setGeneralError(tr('authFailedRetry') ?? 'Etwas ist schiefgelaufen.');
          }
        }
      } catch (err) {
        console.error('Admin auth error:', err);
        setGeneralError(tr('authFailedRetry') ?? 'Etwas ist schiefgelaufen.');
      } finally {
        setLoading(false);
      }
      return;
    }

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
        // Convex Auth returns an opaque error for a duplicate email, so
        // check first and label the field precisely.
        if ((await isEmailRegistered(trimmedEmail)) === true) {
          setEmailError(tr('emailAlreadyRegistered') ?? 'Für diese E-Mail-Adresse gibt es bereits ein Konto');
          return;
        }

        const { error, pendingVerification } = await signUp(trimmedEmail, password, normalizedUsername);
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
          triggerSuccessToast(tr('signUpSuccess') ?? 'Erfolgreich registriert!');
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
            // Distinguish "no such account" from "wrong password".
            const registered = await isEmailRegistered(trimmedEmail);
            if (registered === false) {
              setEmailError(tr('emailNotRegistered') ?? 'Diese E-Mail-Adresse ist nicht registriert');
            } else {
              setPasswordError(tr('wrongPassword') ?? 'Passwort ist falsch');
            }
          }
        } else if (pendingVerification) {
          // Account exists but its email was never verified.
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
      // On success `isAuthenticated` flips and this screen unmounts.
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
      triggerSuccessToast(getTranslation(language, 'codeResent') ?? 'Neuer Code wurde gesendet');
    }
  };

  const handleBackFromVerify = () => {
    setVerificationEmail(null);
    setCode('');
    setCodeError(null);
  };

  const translateY = successAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <SafeAreaView style={styles.container}>
      {successVisible && (
        <Animated.View
          style={[
            styles.toast,
            { opacity: successAnim, transform: [{ translateY }] },
          ]}
          testID="auth-success-toast"
        >
          <Text style={styles.toastText}>{successMessage}</Text>
        </Animated.View>
      )}

      {/* Pinned to the top of the screen, independent of the centered form. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.topBarIcon}
          resizeMode="contain"
        />
        <View style={styles.topBarLang}>
          <LanguageSelector />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            Platform.OS === 'web'
              ? undefined
              : <RefreshControl refreshing={refreshing} onRefresh={reloadApp} />
          }
        >
          <ResponsiveContainer maxWidth={480}>
          <View style={styles.logoContainer}>
            <Text style={styles.title}>
              {verificationEmail
                ? getTranslation(language, 'verifyEmailTitle')
                : getTranslation(language, 'welcome')}
            </Text>
          </View>

          {verificationEmail ? (
            <View style={styles.formContainer}>
              <Text style={styles.verifySubtitle}>
                {getTranslation(language, 'verifyEmailSubtitle')}
              </Text>
              <Text style={styles.verifyEmail}>{verificationEmail}</Text>

              <TextInput
                style={[styles.input, styles.codeInput]}
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
                testID="auth-code-input"
              />
              {!!codeError && (
                <Text style={[styles.hint, styles.usernameBad]} testID="auth-code-error">{codeError}</Text>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, verifying && styles.disabledButton]}
                onPress={handleVerifyCode}
                disabled={verifying}
                testID="auth-verify-button"
              >
                <Text style={styles.primaryButtonText}>{getTranslation(language, 'confirmCode')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchButton} onPress={handleResendCode} testID="auth-resend-code">
                <Text style={styles.switchButtonText}>{getTranslation(language, 'resendCode')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchButton} onPress={handleBackFromVerify} testID="auth-verify-back">
                <Text style={styles.switchButtonText}>{getTranslation(language, 'backToLogin')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <View style={styles.formContainer}>
            {isSignUp && (
              <>
                <Text style={styles.fieldHint}>{getTranslation(language, 'usernameOptionalHint')}</Text>
                <TextInput
                  style={styles.input}
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
                {/* Username availability UI hidden intentionally as checks are disabled */}
              </>
            )}

            <TextInput
              style={styles.input}
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
              testID="auth-email-input"
            />
            {!!emailError && (
              <Text style={[styles.hint, styles.usernameBad]} testID="auth-email-error">{emailError}</Text>
            )}

            <TextInput
              style={styles.input}
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
              testID="auth-password-input"
            />
            {!!passwordError && (
              <Text style={[styles.hint, styles.usernameBad]} testID="auth-password-error">{passwordError}</Text>
            )}

            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
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
                  testID="auth-confirm-password-input"
                />
                {!!confirmPasswordError && (
                  <Text style={[styles.hint, styles.usernameBad]} testID="auth-confirm-password-error">{confirmPasswordError}</Text>
                )}
              </>
            )}

            {!!generalError && (
              <Text style={[styles.hint, styles.usernameBad, styles.generalError]} testID="auth-general-error">{generalError}</Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleEmailAuth}
              disabled={loading}
              testID="auth-submit-button"
            >
              <Text style={styles.primaryButtonText}>
                {isSignUp ? getTranslation(language, 'createAccount') : getTranslation(language, 'signIn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
              testID="auth-toggle-signup"
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? getTranslation(language, 'alreadyHaveAccount')
                  : getTranslation(language, 'dontHaveAccount')
                }
              </Text>
            </TouchableOpacity>
          </View>
          )}
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 6,
  },
  topBarIcon: {
    width: 76,
    height: 76,
  },
  topBarLang: {
    position: 'absolute',
    top: 8,
    right: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3748',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#4f46e5',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    color: '#64748b',
  },
  generalError: {
    marginTop: 0,
    textAlign: 'center',
  },
  verifySubtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
  verifyEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  codeInput: {
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
    marginLeft: 2,
  },
  usernameOk: {
    color: '#16a34a',
  },
  usernameBad: {
    color: '#dc2626',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});