import React, { useState, useCallback } from 'react';
import { showAlert } from '@/lib/alert';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { ArrowLeft, ChevronRight, Bell, Lock, Globe, Trash2, Info, Shield, Moon, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';

export default function SettingsScreen() {
  const { user, updateSettings, deleteAccount, deleteAccountPending, changePassword, changePasswordPending } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrent, setShowCurrent] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  // Google accounts that never set a password create one without the current-password step.
  const hasPassword = user?.passwordSet !== false;

  const userId = user?.id ?? '';
  const settingsQuery = trpc.auth.getSettings.useQuery(
    {},
    { enabled: !!userId }
  );

  const pushEnabled = settingsQuery.data?.pushEnabled ?? true;
  const emailEnabled = settingsQuery.data?.emailEnabled ?? true;
  const darkMode = settingsQuery.data?.darkMode ?? false;
  const smsEnabled = settingsQuery.data?.smsEnabled ?? true;

  const handleToggleSms = useCallback(async (v: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateSettings({ smsEnabled: v });
    } catch (e) {
      console.log('[Settings] SMS toggle error:', e);
    }
  }, [updateSettings]);

  const handleTogglePush = useCallback(async (v: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateSettings({ pushEnabled: v });
    } catch (e) {
      console.log('[Settings] Push toggle error:', e);
    }
  }, [updateSettings]);

  const handleToggleEmail = useCallback(async (v: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateSettings({ emailEnabled: v });
    } catch (e) {
      console.log('[Settings] Email toggle error:', e);
    }
  }, [updateSettings]);

  const handleToggleDarkMode = useCallback(async (v: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateSettings({ darkMode: v });
      if (v) {
        showAlert('Dark Mode', 'Dark mode preference saved. Full dark mode support coming soon.');
      }
    } catch (e) {
      console.log('[Settings] Dark mode toggle error:', e);
    }
  }, [updateSettings]);

  const handleChangePassword = useCallback(async () => {
    if (hasPassword && !currentPassword) {
      showAlert('Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      showAlert('Error', 'New password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'New passwords do not match.');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await changePassword(hasPassword ? { currentPassword, newPassword } : { newPassword });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Success', hasPassword ? 'Your password has been updated. Other devices were signed out.' : 'Password set. You can now also sign in with your email and password.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.log('[Settings] Password change error:', e);
      const msg = e instanceof Error ? e.message : 'Failed to update password. Please try again.';
      showAlert('Error', msg);
    }
  }, [hasPassword, currentPassword, newPassword, confirmPassword, changePassword]);

  const handleDeleteAccount = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    showAlert('Delete Account', 'This action is permanent and cannot be undone. All your data, properties, and conversations will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            router.replace('/login');
          } catch (e) {
            console.log('[Settings] Delete account error:', e);
            showAlert('Error', 'Failed to delete account. Please try again.');
          }
        },
      },
    ]);
  }, [deleteAccount]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => goBack()} style={styles.backBtn} testID="back">
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
            <Switch value={pushEnabled} onValueChange={handleTogglePush} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={pushEnabled ? Colors.primary : Colors.textLight} />
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
            <Switch value={emailEnabled} onValueChange={handleToggleEmail} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={emailEnabled ? Colors.primary : Colors.textLight} />
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Bell size={18} color={Colors.success} /></View>
              <View>
                <Text style={styles.settingLabel}>SMS Alerts</Text>
                <Text style={styles.settingDesc}>Bookings, payments & payouts by text to your phone</Text>
              </View>
            </View>
            <Switch value={smsEnabled} onValueChange={handleToggleSms} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={smsEnabled ? Colors.primary : Colors.textLight} testID="sms-toggle" />
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
            <Switch value={darkMode} onValueChange={handleToggleDarkMode} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={darkMode ? Colors.primary : Colors.textLight} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPasswordForm(!showPasswordForm); }}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Lock size={18} color={Colors.success} /></View>
              <Text style={styles.settingLabel}>{hasPassword ? 'Change Password' : 'Set Password'}</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} style={{ transform: [{ rotate: showPasswordForm ? '90deg' : '0deg' }] }} />
          </Pressable>
          {showPasswordForm && (
            <View style={styles.passwordForm}>
              {!hasPassword && (
                <Text style={styles.settingDesc}>You signed up with Google. Set a password to also sign in with your email.</Text>
              )}
              {hasPassword && (
                <View style={styles.passwordField}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Current password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="password"
                    autoComplete="current-password"
                    testID="current-password"
                  />
                  <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                    {showCurrent ? <EyeOff size={18} color={Colors.textSecondary} /> : <Eye size={18} color={Colors.textSecondary} />}
                  </Pressable>
                </View>
              )}
              <View style={styles.passwordField}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password (8+ chars, letters & numbers)"
                  placeholderTextColor={Colors.textLight}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="newPassword"
                  autoComplete="new-password"
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
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="newPassword"
                testID="confirm-password"
              />
              <Pressable style={styles.changePasswordBtn} onPress={handleChangePassword} disabled={changePasswordPending} testID="submit-password">
                {changePasswordPending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.changePasswordText}>{hasPassword ? 'Update Password' : 'Set Password'}</Text>
                )}
              </Pressable>
            </View>
          )}
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/privacy'); }} testID="settings-privacy">
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Shield size={18} color={Colors.categoryOffice} /></View>
              <View>
                <Text style={styles.settingLabel}>Privacy & Data</Text>
                <Text style={styles.settingDesc}>What we collect, why, and for how long</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => showAlert('Perfect Space v1.0.0', 'A modern property rental and sales platform.\n\nBuilt for property owners and renters to connect, list, and discover properties with ease.')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Info size={18} color={Colors.textSecondary} /></View>
              <View>
                <Text style={styles.settingLabel}>About Perfect Space</Text>
                <Text style={styles.settingDesc}>Version 1.0.0</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={handleDeleteAccount} disabled={deleteAccountPending}>
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
  bottomSpacer: { height: 40 },
});
