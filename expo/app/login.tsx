import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const { login, googleAuth, loginPending, loginError, resetLoginError, googleAuthPending, isAuthenticated } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: Platform.OS === 'web' });

  const [_request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId ?? '',
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
    },
    GOOGLE_DISCOVERY
  );

  const handleGoogleResponse = useCallback(async (accessToken: string) => {
    try {
      console.log('[Login] Fetching Google user info...');
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();
      console.log('[Login] Google user info:', userInfo.email, userInfo.name);

      await googleAuth({
        email: userInfo.email,
        name: userInfo.name ?? 'Google User',
        avatar: userInfo.picture,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: unknown) {
      console.log('[Login] Google auth error:', e);
      const msg = e instanceof Error ? e.message : 'Failed to sign in with Google';
      Alert.alert('Google Sign-In Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  }, [googleAuth]);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      console.log('[Login] Google OAuth success, got access token');
      void handleGoogleResponse(response.authentication.accessToken);
    } else if (response?.type === 'error') {
      console.log('[Login] Google OAuth error:', response.error);
      setGoogleLoading(false);
      Alert.alert('Google Sign-In Error', 'Authentication failed. Please try again.');
    } else if (response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response, handleGoogleResponse]);

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!email.includes('@')) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    resetLoginError();
    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      return;
    }
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login({ email: email.trim(), password });
      router.replace('/');
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleClientId) {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In requires a Google OAuth Client ID. Please configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment variables.\n\nYou can get one from the Google Cloud Console.',
        [
          { text: 'Sign Up Instead', onPress: () => router.push('/signup') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    setGoogleLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      void promptAsync();
    } catch (e) {
      console.log('[Login] Google prompt error:', e);
      setGoogleLoading(false);
      Alert.alert('Error', 'Failed to open Google Sign-In. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <Building2 size={36} color={Colors.white} />
              </View>
              <Text style={styles.appName}>Perfect Space</Text>
              <Text style={styles.tagline}>Find your perfect space</Text>
            </View>

            <Animated.View style={[styles.formSection, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.subtitleText}>Sign in to continue</Text>

              {loginError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{loginError}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email ? styles.inputError : null]}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: undefined })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="login-email"
                />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    testID="login-password"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={20} color={Colors.textLight} /> : <Eye size={20} color={Colors.textLight} />}
                  </Pressable>
                </View>
                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              </View>

              <Pressable
                style={[styles.loginButton, loginPending && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loginPending}
                testID="login-submit"
              >
                {loginPending ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={[styles.googleButton, (googleLoading || googleAuthPending) && styles.googleButtonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading || googleAuthPending}
                testID="google-signin"
              >
                {(googleLoading || googleAuthPending) ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don{"'"}t have an account? </Text>
                <Pressable onPress={() => router.push('/signup')} testID="go-signup">
                  <Text style={styles.signupLink}>Sign Up</Text>
                </Pressable>
              </View>

              <View style={styles.adminHint}>
                <Text style={styles.adminHintText}>
                  Admin login: admin@perfectspace.com / admin123
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  formSection: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: Colors.error + '12',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500' as const,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  adminHint: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminHintText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
});
