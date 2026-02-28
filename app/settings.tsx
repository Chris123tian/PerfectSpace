import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, Bell, Lock, Globe, Trash2, Info, Shield, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const handleClearData = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Clear All Data', 'This will reset the entire app. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Data', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          logout();
          router.replace('/login');
        },
      },
    ]);
  }, [logout]);

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                <Text style={styles.settingDesc}>Coming soon</Text>
              </View>
            </View>
            <Switch value={darkMode} onValueChange={(v) => { setDarkMode(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Alert.alert('Coming Soon', 'Dark mode will be available in a future update.'); setDarkMode(false); }} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={darkMode ? Colors.primary : Colors.textLight} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => Alert.alert('Change Password', 'Password change functionality coming soon!')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Lock size={18} color={Colors.success} /></View>
              <Text style={styles.settingLabel}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.settingRow} onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}>
            <View style={styles.settingLeft}>
              <View style={styles.iconBg}><Shield size={18} color={Colors.categoryOffice} /></View>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={() => Alert.alert('PropertyHub v1.0.0', 'A modern property rental and sales platform.')}>
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

        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <Pressable style={styles.settingRow} onPress={handleClearData}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBg, { backgroundColor: Colors.warning + '15' }]}><Trash2 size={18} color={Colors.warning} /></View>
              <Text style={styles.settingLabel}>Clear App Data</Text>
            </View>
            <ChevronRight size={18} color={Colors.textLight} />
          </Pressable>
          <View style={styles.divider} />
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
  bottomSpacer: { height: 40 },
});
