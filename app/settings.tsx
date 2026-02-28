import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, Bell, Lock, Globe, Trash2, Info, Shield, Moon, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }
    if (currentPassword !== user?.password) {
      Alert.alert('Error', 'Current password is incorrect.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({ password: newPassword } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been updated.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.log('[Settings] Password change error:', e);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    }
  }, [currentPassword, newPassword, confirmPassword, user?.password, updateProfile]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone. All your data will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          logout();
          router.replace('/login');
        },
      },
    ]);
  }, [logout]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Bell size={18} color={Colors.primary} /></View>
              <View>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive alerts on your device</Text>
              </View>
            </View>
            <Switch value={pushEnabled} onValueChange={(v) => { setPushEnabled(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={pushEnabled ? Colors.primary : Colors.textLight} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Globe size={18} color={Colors.categoryApartment} /></View>
              <View>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Receive updates via email</Text>
              </View>
            </View>
            <Switch value={emailEnabled} onValueChange={(v) => { setEmailEnabled(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={emailEnabled ? Colors.primary : Colors.textLight} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Moon size={18} color={Colors.categoryOffice} /></View>
              <View>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDesc}>{darkMode ? 'Enabled' : 'Light theme active'}</Text>
              </View>
            </View>
            <Switch value={darkMode} onValueChange={(v) => { setDarkMode(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (v) { Alert.alert('Dark Mode', 'Dark mode has been enabled. Some screens may not fully support dark mode yet.'); } }} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={darkMode ? Colors.primary : Colors.textLight} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPasswordForm(!showPasswordForm); }}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Lock size={18} color={Colors.success} /></View>
              <Text style={styles.settingLabel}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} style={{ transform: [{ rotate: showPasswordForm ? '90deg' : '0deg' }] }} />
          </Pressable>
          {showPasswordForm && (
            <View style={styles.passwordForm}>
              <View style={styles.passwordField}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showCurrent}
                  testID="current-password"
                />
                <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                  {showCurrent ? <EyeOff size={18} color={Colors.textSecondary} /> : <Eye size={18} color={Colors.textSecondary} />}
                </Pressable>
              </View>
              <View style={styles.passwordField}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password (min 6 chars)"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showNew}
                  testID="new-password"
                />
                <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  {showNew ? <EyeOff size={18} color={Colors.textSecondary} /> : <Eye size={18} color={Colors.textSecondary} />}
                </Pressable>
              </View>
              <TextInput
                style={styles.passwordInputFull}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showNew}
                testID="confirm-password"
              />
              <Pressable style={styles.changePasswordBtn} onPress={handleChangePassword} testID="submit-password">
                <Text style={styles.changePasswordText}>Update Password</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPrivacy(!showPrivacy); }}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Shield size={18} color={Colors.categoryOffice} /></View>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} style={{ transform: [{ rotate: showPrivacy ? '90deg' : '0deg' }] }} />
          </Pressable>
          {showPrivacy && (
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>PropertyHub Privacy Policy</Text>
              <Text style={styles.privacyText}>
                {`1. Data Collection\nWe collect information you provide when creating an account, listing properties, and communicating with other users.\n\n2. Data Usage\nYour data is used to provide and improve our services, connect renters with property owners, and personalize your experience.\n\n3. Data Storage\nAll data is stored securely on your device. We do not share your personal information with third parties without your consent.\n\n4. Your Rights\n• Access your personal data at any time\n• Request data deletion via account settings\n• Opt out of notifications\n• Update or correct your information\n\n5. Communication\nWe may send notifications about bookings, messages, and platform updates. You can manage these in notification settings.\n\n6. Contact Us\nFor privacy concerns, contact support@propertyhub.com`}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => Alert.alert('PropertyHub v1.0.0', 'A modern property rental and sales platform.\n\nBuilt for property owners and renters to connect, list, and discover properties with ease.')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Info size={18} color={Colors.textSecondary} /></View>
              <View>
                <Text style={styles.settingLabel}>About PropertyHub</Text>
                <Text style={styles.settingDesc}>Version 1.0.0</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBg, { backgroundColor: Colors.error + '15' }]}><Trash2 size={18} color={Colors.error} /></View>
              <Text style={[styles.settingLabel, { color: Colors.error }]}>Delete Account</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  card: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' as const, color: Colors.text },
  settingDesc: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 64 },
  passwordForm: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  passwordField: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: Colors.text },
  passwordInputFull: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  changePasswordBtn: { backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  changePasswordText: { fontSize: 15, fontWeight: '600' as const, color: Colors.white },
  privacyContent: { paddingHorizontal: 16, paddingBottom: 16 },
  privacyTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 10 },
  privacyText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  bottomSpacer: { height: 40 },
});
