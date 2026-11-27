import React, { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Building2, Mail } from 'lucide-react-native';
import { goBack } from '@/lib/nav';
import { showAlert } from '@/lib/alert';
import Colors from '@/constants/colors';

const SUPPORT_EMAIL = 'support@perfectspace.com';

export default function ForgotPasswordScreen() {
  const contactSupport = useCallback(async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Password%20reset`);
    } catch {
      showAlert('Contact Support', `Email ${SUPPORT_EMAIL} to reset your password.`);
    }
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Building2 size={36} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Perfect Space</Text>
          <Text style={styles.tagline}>Reset your password</Text>
        </View>
        <View style={styles.formSection}>
          <Pressable onPress={() => goBack('/login')} style={styles.backBtn} testID="back-forgot">
            <ArrowLeft size={20} color={Colors.textSecondary} />
            <Text style={styles.backText}>Back to Login</Text>
          </Pressable>
          <Text style={styles.formTitle}>Contact Support</Text>
          <Text style={styles.formSubtitle}>
            To protect your account, password resets require support verification. Email us and we’ll help you regain access.
          </Text>
          <Pressable onPress={() => void contactSupport()} style={styles.primaryBtn} testID="contact-password-support">
            <Mail size={18} color={Colors.white} />
            <Text style={styles.primaryBtnText}>Email {SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  safeArea: { flex: 1 },
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
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
