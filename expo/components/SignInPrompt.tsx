import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface SignInPromptProps {
  title?: string;
  subtitle?: string;
  testIDPrefix?: string;
}

export default function SignInPrompt({
  title = 'Sign in to continue',
  subtitle = 'Create a free account to message owners, save properties and book viewings.',
  testIDPrefix = 'signin-prompt',
}: SignInPromptProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <LogIn size={30} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Pressable
        style={styles.signInButton}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/login');
        }}
        testID={`${testIDPrefix}-button`}
      >
        <LogIn size={18} color={Colors.white} />
        <Text style={styles.signInText}>Sign In</Text>
      </Pressable>
      <Pressable
        style={styles.signupButton}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/signup');
        }}
        testID={`${testIDPrefix}-signup`}
      >
        <UserPlus size={18} color={Colors.primary} />
        <Text style={styles.signupText}>Create Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700' as const, color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21, marginBottom: 24 },
  signInButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignSelf: 'stretch' },
  signInText: { color: Colors.white, fontSize: 16, fontWeight: '700' as const },
  signupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: 13, paddingHorizontal: 32, alignSelf: 'stretch', marginTop: 10 },
  signupText: { color: Colors.primary, fontSize: 16, fontWeight: '700' as const },
});
