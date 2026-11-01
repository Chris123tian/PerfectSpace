import React, { useState, useCallback } from 'react';
import { showAlert } from '@/lib/alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { trpc, getBaseUrl } from '@/lib/trpc';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [foundUserId, setFoundUserId] = useState<string | null>(null);

  const getAllUsersMutation = trpc.auth.getAllUsers.useQuery(undefined, { enabled: false });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation();

  const handleCheckEmail = useCallback(async () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email address';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // Fetch all users to find the email
      const response = await fetch(
        `${getBaseUrl()}/api/trpc/auth.getAllUsers`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      const json = await response.json() as { result?: { data?: { json?: Array<{ id: string; email: string }> } } };
      const users = json?.result?.data?.json ?? [];
      const found = users.find((u: { id: string; email: string }) =>
        u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!found) {
        setErrors({ email: 'No account found with this email address.' });
        setLoading(false);
        return;
      }

      setFoundUserId(found.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('reset');
    } catch (err) {
      console.log('[ForgotPassword] Error:', err);
      showAlert('Error', 'Unable to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleResetPassword = useCallback(async () => {
    const e: Record<string, string> = {};
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 6) e.newPassword = 'Minimum 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    if (!foundUserId) return;
    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfileMutation.mutateAsync({
        userId: foundUserId,
        updates: { password: newPassword },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        'Password Reset',
        'Your password has been updated successfully. Please log in with your new password.',
        [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
      );
    } catch (err) {
      console.log('[ForgotPassword] Reset error:', err);
      showAlert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [foundUserId, newPassword, confirmPassword, updateProfileMutation]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.heroSection}>
              <View style={styles.logoContainer}>
                <Building2 size={36} color={Colors.white} />
              </View>
              <Text style={styles.appName}>Perfect Space</Text>
              <Text style={styles.tagline}>Reset your password</Text>
            </View>

            <View style={styles.formSection}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-forgot">
                <ArrowLeft size={20} color={Colors.textSecondary} />
                <Text style={styles.backText}>Back to Login</Text>
              </Pressable>

              {step === 'email' ? (
                <>
                  <Text style={styles.formTitle}>Forgot Password?</Text>
                  <Text style={styles.formSubtitle}>
                    Enter the email address associated with your account and we'll help you reset your password.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={[styles.inputWrapper, errors.email ? styles.inputError : null]}>
                      <Mail size={18} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        placeholderTextColor={Colors.textLight}
                        value={email}
                        onChangeText={(t) => { setEmail(t); setErrors({}); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        testID="forgot-email"
                      />
                    </View>
                    {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
                  </View>

                  <Pressable
                    style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                    onPress={handleCheckEmail}
                    disabled={loading}
                    testID="check-email"
                  >
                    {loading
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.primaryBtnText}>Continue</Text>
                    }
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.formTitle}>Create New Password</Text>
                  <Text style={styles.formSubtitle}>
                    Set a new password for <Text style={styles.emailHighlight}>{email}</Text>
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={[styles.inputWrapper, errors.newPassword ? styles.inputError : null]}>
                      <Lock size={18} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Min. 6 characters"
                        placeholderTextColor={Colors.textLight}
                        value={newPassword}
                        onChangeText={(t) => { setNewPassword(t); setErrors(e => ({ ...e, newPassword: '' })); }}
                        secureTextEntry={!showNew}
                        testID="new-password"
                      />
                      <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                        {showNew ? <EyeOff size={18} color={Colors.textLight} /> : <Eye size={18} color={Colors.textLight} />}
                      </Pressable>
                    </View>
                    {errors.newPassword ? <Text style={styles.fieldError}>{errors.newPassword}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <View style={[styles.inputWrapper, errors.confirmPassword ? styles.inputError : null]}>
                      <Lock size={18} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor={Colors.textLight}
                        value={confirmPassword}
                        onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
                        secureTextEntry={!showConfirm}
                        testID="confirm-new-password"
                      />
                      <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                        {showConfirm ? <EyeOff size={18} color={Colors.textLight} /> : <Eye size={18} color={Colors.textLight} />}
                      </Pressable>
                    </View>
                    {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
                  </View>

                  <Pressable
                    style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                    onPress={handleResetPassword}
                    disabled={loading}
                    testID="reset-password"
                  >
                    {loading
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.primaryBtnText}>Reset Password</Text>
                    }
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 32 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  formSection: {
    flex: 1, backgroundColor: Colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  formTitle: { fontSize: 26, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.3, marginBottom: 8 },
  formSubtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 28, lineHeight: 22 },
  emailHighlight: { fontWeight: '700' as const, color: Colors.primary },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: Colors.text },
  inputError: { borderColor: Colors.error },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  fieldError: { color: Colors.error, fontSize: 12, marginTop: 4, fontWeight: '500' as const },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
