import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';

const INK = '#0B1220';
const PANEL = '#121B2E';
const LINE = '#22304A';
const TEXT = '#E8EEF8';
const MUTED = '#8A99B4';
const ACCENT = '#3DD9B3';
const DANGER = '#FF6B6B';

/**
 * Staff-only sign-in. Not linked from the member app: staff open /portal directly.
 * The server refuses member accounts here and refuses staff accounts in the app login.
 */
export default function StaffPortalScreen() {
  const { login, user, isStaff, logout } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [show, setShow] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user && isStaff) router.replace('/admin');
  }, [user, isStaff]);

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your staff email and password.');
      return;
    }
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // A member signed in on this device is signed out first.
      if (user && !isStaff) await logout();
      await login({ email: email.trim(), password, portal: 'admin' });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/admin');
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }, [email, password, login, user, isStaff, logout]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.glow} pointerEvents="none" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => (router.canGoBack() ? goBack() : router.replace('/'))} style={styles.back} testID="portal-back">
              <ArrowLeft size={20} color={MUTED} />
            </Pressable>

            <View style={styles.card}>
              <View style={styles.badge}>
                <ShieldCheck size={28} color={ACCENT} />
              </View>
              <Text style={styles.kicker}>PERFECT SPACE</Text>
              <Text style={styles.title}>Staff Console</Text>
              <Text style={styles.subtitle}>Restricted access. Every sign-in and action is recorded.</Text>

              <View style={styles.field}>
                <Mail size={18} color={MUTED} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Staff email"
                  placeholderTextColor={MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  autoComplete="email"
                  testID="portal-email"
                />
              </View>
              <View style={styles.field}>
                <Lock size={18} color={MUTED} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="password"
                  autoComplete="current-password"
                  onSubmitEditing={handleSubmit}
                  returnKeyType="go"
                  testID="portal-password"
                />
                <Pressable onPress={() => setShow(s => !s)} hitSlop={8}>
                  {show ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
                </Pressable>
              </View>

              {!!error && <Text style={styles.error} testID="portal-error">{error}</Text>}

              <Pressable
                style={({ pressed }) => [styles.submit, (busy || pressed) && { opacity: 0.85 }]}
                onPress={handleSubmit}
                disabled={busy}
                testID="portal-submit"
              >
                {busy ? <ActivityIndicator color={INK} /> : <Text style={styles.submitText}>Sign in to console</Text>}
              </Pressable>

              <Text style={styles.foot}>Locked for 15 minutes after 5 failed attempts.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  glow: { position: 'absolute', top: -160, alignSelf: 'center', width: 420, height: 420, borderRadius: 210, backgroundColor: ACCENT, opacity: 0.08 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  back: { position: 'absolute', top: 8, left: 20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: PANEL, zIndex: 2 },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: PANEL, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: LINE, gap: 14 },
  badge: { width: 56, height: 56, borderRadius: 16, backgroundColor: ACCENT + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ACCENT + '40' },
  kicker: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 2.5, color: ACCENT, marginTop: 6 },
  title: { fontSize: 28, fontWeight: '800' as const, color: TEXT, marginTop: -6 },
  subtitle: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: INK, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: LINE },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: TEXT },
  error: { color: DANGER, fontSize: 13, fontWeight: '600' as const },
  submit: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitText: { color: INK, fontSize: 16, fontWeight: '800' as const },
  foot: { fontSize: 11, color: MUTED, textAlign: 'center' },
});
