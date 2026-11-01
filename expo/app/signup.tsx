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
import { ArrowLeft, ArrowRight, Eye, EyeOff, Home, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/property';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function SignupScreen() {
  const { signup, googleAuth, signupPending, signupError, resetSignupError, googleAuthPending, isAuthenticated } = useAuth();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<UserRole>('renter');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      console.log('[Signup] Fetching Google user info...');
      const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();
      console.log('[Signup] Google user info:', userInfo.email, userInfo.name);

      await googleAuth({
        email: userInfo.email,
        name: userInfo.name ?? 'Google User',
        avatar: userInfo.picture,
        role: role === 'renter' || role === 'landlord' ? role : 'renter',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: unknown) {
      console.log('[Signup] Google auth error:', e);
      const msg = e instanceof Error ? e.message : 'Failed to sign up with Google';
      Alert.alert('Google Sign-Up Failed', msg);
    } finally {
      setGoogleLoading(false);
    }
  }, [googleAuth, role]);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      console.log('[Signup] Google OAuth success, got access token');
      void handleGoogleResponse(response.authentication.accessToken);
    } else if (response?.type === 'error') {
      console.log('[Signup] Google OAuth error:', response.error);
      setGoogleLoading(false);
      Alert.alert('Google Sign-Up Error', 'Authentication failed. Please try again.');
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
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (!phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    resetSignupError();
    if (!validate()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      return;
    }
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signup({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), role });
      router.replace('/');
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
    }
  };

  const handleGoogleSignUp = async () => {
    if (!googleClientId) {
      Alert.alert(
        'Google Sign-Up',
        'Google Sign-Up requires a Google OAuth Client ID. Please configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your environment variables.\n\nYou can get one from the Google Cloud Console.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    setGoogleLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      void promptAsync();
    } catch (e) {
      console.log('[Signup] Google prompt error:', e);
      setGoogleLoading(false);
      Alert.alert('Error', 'Failed to open Google Sign-Up. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backButton} testID="back-button">
                <ArrowLeft size={24} color={Colors.white} />
              </Pressable>
              <Text style={styles.headerTitle}>Create Account</Text>
              <View style={{ width: 40 }} />
            </View>

            <Animated.View style={[styles.formSection, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={styles.title}>Join Perfect Space</Text>
              <Text style={styles.subtitle}>Choose your role to get started</Text>

              <View style={styles.roleRow}>
                <Pressable
                  style={[styles.roleCard, role === 'renter' && styles.roleCardActive]}
                  onPress={() => { setRole('renter'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  testID="role-renter"
                >
                  <Home size={24} color={role === 'renter' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.roleLabel, role === 'renter' && styles.roleLabelActive]}>Renter</Text>
                  <Text style={styles.roleDesc}>Find properties</Text>
                </Pressable>
                <Pressable
                  style={[styles.roleCard, role === 'landlord' && styles.roleCardActive]}
                  onPress={() => { setRole('landlord'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  testID="role-landlord"
                >
                  <Building2 size={24} color={role === 'landlord' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.roleLabel, role === 'landlord' && styles.roleLabelActive]}>Landlord</Text>
                  <Text style={styles.roleDesc}>List properties</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.googleButton, (googleLoading || googleAuthPending) && styles.googleButtonDisabled]}
                onPress={handleGoogleSignUp}
                disabled={googleLoading || googleAuthPending}
                testID="google-signup"
              >
                {(googleLoading || googleAuthPending) ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign up with email</Text>
                <View style={styles.dividerLine} />
              </View>

              {signupError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{signupError}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.textLight}
                  value={name}
                  onChangeText={(t) => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
                  autoComplete="name"
                  testID="signup-name"
                />
                {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email ? styles.inputError : null]}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setErrors(e => ({ ...e, email: '' })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="signup-email"
                />
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={Colors.textLight}
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setErrors(e => ({ ...e, phone: '' })); }}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  testID="signup-phone"
                />
                {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Min 6 characters"
                    placeholderTextColor={Colors.textLight}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    testID="signup-password"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    {showPassword ? <EyeOff size={20} color={Colors.textLight} /> : <Eye size={20} color={Colors.textLight} />}
                  </Pressable>
                </View>
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
              </View>

              <Pressable
                style={[styles.signupButton, signupPending && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={signupPending}
                testID="signup-submit"
              >
                {signupPending ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={styles.signupButtonText}>Create Account</Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </>
                )}
              </Pressable>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Pressable onPress={() => router.back()} testID="go-login">
                  <Text style={styles.loginLink}>Sign In</Text>
                </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  formSection: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  roleLabelActive: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.textLight,
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
    marginBottom: 16,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
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
  signupButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
