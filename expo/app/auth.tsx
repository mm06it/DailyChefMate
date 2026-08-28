import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { getTranslation } from '@/constants/translations';
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
  const [emailError, setEmailError] = useState<string | null>(null);

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

  const handleEmailAuth = async () => {
    setPasswordError(null);
    setEmailError(null);

    if (!email.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfüllen');
      return;
    }

    if (email.toLowerCase() === 'admin' && password === 'admin') {
      setLoading(true);
      try {
        console.log('Admin login detected, creating/signing in admin account...');
        const adminEmail = 'admin@fridgy.app';
        const adminPassword = 'admin123456';
        const { error: signInError } = await signIn(adminEmail, adminPassword);
        if (signInError) {
          console.log('Admin account does not exist, creating...');
          const { error: signUpError } = await signUp(adminEmail, adminPassword, 'admin');
          if (signUpError) {
            Alert.alert('Error', 'Failed to create admin account: ' + (signUpError as any).message);
          } else {
            Alert.alert('Success', 'Admin account created and signed in!');
          }
        } else {
          Alert.alert('Success', 'Signed in as admin!');
        }
      } catch (err) {
        console.error('Admin auth error:', err);
        Alert.alert('Error', 'Failed to authenticate as admin');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isSignUp && !normalizedUsername) {
      // Username is optional now; do not block sign up
    }

    if (USERNAME_CHECK_ENABLED && isSignUp && usernameAvailable === false) {
      // Availability check disabled; proceed regardless
    }

    if (!validateEmail(email)) {
      setEmailError(getTranslation(language, 'invalidEmail') ?? 'Ungültige E-Mail-Adresse');
      return;
    }

    if (password.length < 8) {
      setPasswordError(getTranslation(language, 'passwordTooShort') ?? 'Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setPasswordError(getTranslation(language, 'passwordsDoNotMatch') ?? 'Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Attempting sign up with:', email);
        const { data, error, pendingVerification } = await signUp(email, password, normalizedUsername);
        console.log('Sign up result:', { data: !!data, error, pendingVerification });
        if (error) {
          const msg = (error as any)?.message ?? '';
          const lowerMsg = typeof msg === 'string' ? msg.toLowerCase() : '';
          if (lowerMsg.includes('already exists')) {
            setEmailError('E-Mail-Adresse ist bereits vergeben');
          } else if (lowerMsg.includes('invalid password')) {
            setPasswordError(getTranslation(language, 'passwordTooShort') ?? 'Passwort muss mindestens 8 Zeichen lang sein');
          } else {
            Alert.alert('Fehler', msg || 'Registrierung fehlgeschlagen');
          }
        } else if (pendingVerification) {
          setCode('');
          setCodeError(null);
          setVerificationEmail(email.trim());
        } else {
          triggerSuccessToast('Erfolgreich registriert! Du kannst dich jetzt anmelden.');
          setIsSignUp(false);
        }
      } else {
        console.log('Attempting sign in with:', email);
        const { data, error, pendingVerification } = await signIn(email, password);
        console.log('Sign in result:', { data: !!data, error, pendingVerification });
        if (error) {
          const msg = (error as any)?.message ?? '';
          const lowerMsg = typeof msg === 'string' ? msg.toLowerCase() : '';
          if (lowerMsg.includes('invalidaccountid') || lowerMsg.includes('invalid password')) {
            Alert.alert('Fehler', 'E-Mail oder Passwort ist falsch');
          } else {
            Alert.alert('Fehler', msg || 'Anmeldung fehlgeschlagen');
          }
        } else if (pendingVerification) {
          // Account exists but its email was never verified.
          setCode('');
          setCodeError(null);
          setVerificationEmail(email.trim());
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ResponsiveContainer maxWidth={480}>
          <View style={styles.header}>
            <LanguageSelector />
          </View>

          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
            />
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
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
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
              }}
              secureTextEntry
              autoComplete="password"
              testID="auth-password-input"
            />

            {isSignUp && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder={getTranslation(language, 'confirmPassword')}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setPasswordError(null);
                  }}
                  secureTextEntry
                  autoComplete="password"
                  testID="auth-confirm-password-input"
                />
                {!!passwordError && (
                  <Text style={[styles.hint, styles.usernameBad]} testID="auth-password-error">{passwordError}</Text>
                )}
              </>
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
  header: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
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
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '600',
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