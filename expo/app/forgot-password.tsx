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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Building2, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'email' | 'reset';

const policyError = (pw: string): string | null => {
  if (pw.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number';
  return null;
};

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState('');
  const { resetPassword } = useAuth();

  // Step 1 only validates input locally. The account is checked on the server
  // when the reset is submitted, so this screen never reveals which emails exist.
  const handleCheckEmail = useCallback(() => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email address';
    if (phone.replace(/\D/g, '').length < 6) e.phone = 'Enter the phone number on your account';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrors({});
    setStep('reset');
  }, [email, phone]);

  const handleResetPassword = useCallback(async () => {
    const e: Record<string, string> = {};
    if (!newPassword) e.newPassword = 'New password is required';
    else {
      const pe = policyError(newPassword);
      if (pe) e.newPassword = pe;
    }
    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match';
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await resetPassword({ email: email.trim(), phone: phone.trim(), newPassword });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        'Password Reset',
        'Your password has been updated successfully. Please log in with your new password.',
        [{ text: 'Go to Login', onPress: () => router.replace('/login') }]
      );
    } catch (err) {
      console.log('[ForgotPassword] Reset error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('Could not reset password', msg);
    } finally {
      setLoading(false);
    }
  }, [email, phone, newPassword, confirmPassword, resetPassword]);

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
              <Pressable onPress={() => (step === 'reset' ? setStep('email') : goBack())} style={styles.backBtn} testID="back-forgot">
                <ArrowLeft size={20} color={Colors.textSecondary} />
                <Text style={styles.backText}>Back to Login</Text>
              </Pressable>

              {step === 'email' ? (
                <>
                  <Text style={styles.formTitle}>Forgot Password?</Text>
                  <Text style={styles.formSubtitle}>
                    Confirm the email and phone number on your account to set a new password.
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number on Account</Text>
                    <View style={[styles.inputWrapper, errors.phone ? styles.inputError : null]}>
                      <Phone size={18} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="+233 24 000 0000"
                        placeholderTextColor={Colors.textLight}
                        value={phone}
                        onChangeText={(t) => { setPhone(t); setErrors({}); }}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        testID="forgot-phone"
                      />
                    </View>
                    {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
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
                        placeholder="8+ characters, letters & numbers"
                        placeholderTextColor={Colors.textLight}
                        value={newPassword}
                        onChangeText={(t) => { setNewPassword(t); setErrors(e => ({ ...e, newPassword: '' })); }}
                        secureTextEntry={!showNew}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
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
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
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
