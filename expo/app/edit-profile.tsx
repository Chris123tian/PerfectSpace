import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { X, Camera, ShieldCheck, ShieldAlert, Upload, FileText, CreditCard, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const ID_TYPES = [
  { key: 'ghana_card', label: 'Ghana Card', icon: CreditCard },
  { key: 'passport', label: 'Passport', icon: Globe },
  { key: 'other_id', label: 'Other ID', icon: FileText },
];

export default function EditProfileScreen() {
  const { user, updateProfile, updateProfilePending } = useAuth();
  const [name, setName] = useState<string>(user?.name ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [bio, setBio] = useState<string>(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string>(user?.avatar ?? '');
  const [idDocUri, setIdDocUri] = useState<string>(user?.idDocumentUri ?? '');
  const [selectedIdType, setSelectedIdType] = useState<string>('ghana_card');
  const [idUploading, setIdUploading] = useState<boolean>(false);

  const isLandlord = user?.role === 'landlord';

  const handleChangePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pickFromLibrary = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (e) {
        console.log('[EditProfile] Library error:', e);
      }
    };

    const takePhoto = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow camera access.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setAvatarUri(result.assets[0].uri);
        }
      } catch (e) {
        console.log('[EditProfile] Camera error:', e);
      }
    };

    if (Platform.OS === 'web') {
      void pickFromLibrary();
      return;
    }

    Alert.alert('Change Photo', 'Choose a new profile photo', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const handleUploadIdDocument = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const doPickId = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to upload your ID.');
          return;
        }
        setIdUploading(true);
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
          setIdDocUri(result.assets[0].uri);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log('[EditProfile] ID document selected');
        }
      } catch (e) {
        console.log('[EditProfile] ID pick error:', e);
        Alert.alert('Error', 'Failed to select document. Please try again.');
      } finally {
        setIdUploading(false);
      }
    };

    const doTakeId = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow camera access to photograph your ID.');
          return;
        }
        setIdUploading(true);
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
          setIdDocUri(result.assets[0].uri);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log('[EditProfile] ID document photographed');
        }
      } catch (e) {
        console.log('[EditProfile] ID camera error:', e);
        Alert.alert('Error', 'Failed to capture document. Please try again.');
      } finally {
        setIdUploading(false);
      }
    };

    if (Platform.OS === 'web') {
      void doPickId();
      return;
    }

    Alert.alert(
      'Upload ID Document',
      `Upload a clear photo of your ${ID_TYPES.find(t => t.key === selectedIdType)?.label ?? 'ID'}`,
      [
        { text: 'Take Photo', onPress: doTakeId },
        { text: 'Choose from Library', onPress: doPickId },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [selectedIdType]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updates: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      };
      if (avatarUri !== user?.avatar) {
        updates.avatar = avatarUri;
      }
      if (idDocUri && idDocUri !== user?.idDocumentUri) {
        updates.idDocumentUri = idDocUri;
        // When an ID is uploaded, mark as pending verification (admin will verify)
        // For now we simulate pending with a note - admin can mark verified
      }
      await updateProfile(updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.log('[EditProfile] Error:', e);
      Alert.alert('Error', 'Failed to update profile. Please make sure you are logged in.');
    }
  }, [name, phone, bio, avatarUri, idDocUri, user?.avatar, user?.idDocumentUri, updateProfile]);

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
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <Pressable style={styles.changePhotoBtn} onPress={handleChangePhoto} testID="change-photo">
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

        {/* ─── Landlord ID Verification Section ─── */}
        {isLandlord && (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              {user.verified ? (
                <ShieldCheck size={22} color={Colors.success} />
              ) : (
                <ShieldAlert size={22} color={Colors.warning} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.verificationTitle}>
                  {user.verified ? 'Account Verified' : 'Verify Your Account'}
                </Text>
                <Text style={styles.verificationSubtitle}>
                  {user.verified
                    ? 'Your identity has been verified. Renters can trust your listings.'
                    : 'Upload a government-issued ID to get verified. Verified landlords get more inquiries.'}
                </Text>
              </View>
            </View>

            {!user.verified && (
              <>
                <Text style={styles.idTypeLabel}>Select ID Type</Text>
                <View style={styles.idTypeRow}>
                  {ID_TYPES.map((idType) => {
                    const IconComp = idType.icon;
                    const active = selectedIdType === idType.key;
                    return (
                      <Pressable
                        key={idType.key}
                        style={[styles.idTypeCard, active && styles.idTypeCardActive]}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedIdType(idType.key);
                        }}
                        testID={`id-type-${idType.key}`}
                      >
                        <IconComp size={20} color={active ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.idTypeText, active && styles.idTypeTextActive]}>
                          {idType.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.idUploadHint}>
                  Take a clear, well-lit photo showing all four corners of the document.
                </Text>

                {idDocUri ? (
                  <View style={styles.idPreviewContainer}>
                    <Image source={{ uri: idDocUri }} style={styles.idPreview} contentFit="cover" />
                    <View style={styles.idPreviewOverlay}>
                      <Pressable
                        style={styles.reuploadBtn}
                        onPress={handleUploadIdDocument}
                        testID="reupload-id"
                      >
                        <Upload size={16} color={Colors.white} />
                        <Text style={styles.reuploadText}>Change Document</Text>
                      </Pressable>
                    </View>
                    <View style={styles.idPreviewBadge}>
                      <Text style={styles.idPreviewBadgeText}>✓ Document added</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={styles.uploadBtn}
                    onPress={handleUploadIdDocument}
                    disabled={idUploading}
                    testID="upload-id"
                  >
                    {idUploading ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <>
                        <View style={styles.uploadIconBg}>
                          <Upload size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.uploadBtnTitle}>Upload ID Document</Text>
                        <Text style={styles.uploadBtnHint}>
                          Ghana Card, Passport or any Government-issued ID
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}

                <View style={styles.verificationNote}>
                  <Text style={styles.verificationNoteText}>
                    🔒 Your document is encrypted and used only for verification. An admin will review and verify your account within 24 hours.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

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
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Verified</Text>
            <Text style={[styles.infoValue, { color: user.verified ? Colors.success : Colors.warning }]}>
              {user.verified ? '✓ Verified' : 'Pending Verification'}
            </Text>
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
  scrollContent: { padding: 20, paddingBottom: 32 },
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

  // Verification card
  verificationCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: Colors.border },
  verificationHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  verificationTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  verificationSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 19 },
  idTypeLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 10 },
  idTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  idTypeCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background, gap: 6,
  },
  idTypeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  idTypeText: { fontSize: 11, fontWeight: '600' as const, color: Colors.textSecondary, textAlign: 'center' as const },
  idTypeTextActive: { color: Colors.primary },
  idUploadHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  uploadBtn: {
    borderWidth: 2, borderStyle: 'dashed' as const, borderColor: Colors.primary,
    borderRadius: 16, paddingVertical: 28, alignItems: 'center', gap: 8,
    backgroundColor: Colors.primaryLight + '20',
  },
  uploadIconBg: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  uploadBtnTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.primary },
  uploadBtnHint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const, paddingHorizontal: 20 },
  idPreviewContainer: { borderRadius: 14, overflow: 'hidden', position: 'relative' as const, marginBottom: 4 },
  idPreview: { width: '100%', height: 180, borderRadius: 14 },
  idPreviewOverlay: { position: 'absolute' as const, bottom: 10, right: 10 },
  reuploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  reuploadText: { fontSize: 13, fontWeight: '600' as const, color: Colors.white },
  idPreviewBadge: {
    position: 'absolute' as const, top: 10, left: 10,
    backgroundColor: Colors.success, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  idPreviewBadgeText: { fontSize: 12, fontWeight: '700' as const, color: Colors.white },
  verificationNote: {
    marginTop: 14, backgroundColor: Colors.background,
    borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  verificationNoteText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  infoCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginTop: 4 },
  infoTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
