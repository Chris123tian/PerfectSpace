import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function EditProfileScreen() {
  const { user, updateProfile, updateProfilePending } = useAuth();
  const [name, setName] = useState<string>(user?.name ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [bio, setBio] = useState<string>(user?.bio ?? '');

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), bio: bio.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.log('[EditProfile] Error:', e);
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [name, phone, bio, updateProfile]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="close">
            <X size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
          <Pressable style={styles.changePhotoBtn} onPress={() => Alert.alert('Change Photo', 'Photo upload coming soon!')}>
            <Camera size={16} color={Colors.primary} />
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </Pressable>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={Colors.textLight} testID="edit-name" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" testID="edit-phone" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder="Tell us about yourself..." placeholderTextColor={Colors.textLight} multiline numberOfLines={4} textAlignVertical="top" maxLength={200} testID="edit-bio" />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user.role === 'landlord' ? 'Property Owner' : user.role === 'admin' ? 'Administrator' : 'Renter'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{user.memberSince}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verified</Text>
            <Text style={[styles.infoValue, { color: user.verified ? Colors.success : Colors.warning }]}>{user.verified ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable style={[styles.saveBtn, updateProfilePending && styles.saveBtnDisabled]} onPress={handleSave} disabled={updateProfilePending} testID="save-profile">
          {updateProfilePending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveText}>Save Changes</Text>}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  scrollContent: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primaryLight },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.primaryLight },
  changePhotoText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  inputDisabled: { backgroundColor: Colors.borderLight, justifyContent: 'center' },
  disabledText: { fontSize: 16, color: Colors.textLight },
  textArea: { height: 100, textAlignVertical: 'top' as const },
  charCount: { fontSize: 12, color: Colors.textLight, textAlign: 'right' as const, marginTop: 4 },
  infoCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginTop: 8 },
  infoTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
