import React, { useState, useCallback } from 'react';
import { showAlert } from '@/lib/alert';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { X, Camera, BadgeCheck, ShieldCheck, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { countryOptions } from '@/lib/countries';

const documentTypes = ['Ghana Card', 'Passport', "Driver's License", 'National ID'];

export default function EditProfileScreen() {
  const { user, updateProfile, updateProfilePending, submitVerification, submitVerificationPending } = useAuth();
  const [name, setName] = useState<string>(user?.name ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [bio, setBio] = useState<string>(user?.bio ?? '');
  const [dob, setDob] = useState<string>(user?.dob ?? '');
  const [country, setCountry] = useState<string>(user?.country ?? 'Ghana');
  const [region, setRegion] = useState<string>(user?.region ?? '');
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [avatarUri, setAvatarUri] = useState<string>(user?.avatar ?? '');
  const [showVerifyForm, setShowVerifyForm] = useState<boolean>(false);
  const [docType, setDocType] = useState<string>(documentTypes[0]);
  const [docName, setDocName] = useState<string>('');
  const [docNumber, setDocNumber] = useState<string>('');
  const [docImage, setDocImage] = useState<string>('');

  const handleChangePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const pickFromLibrary = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Required', 'Please allow access to your photo library.');
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
          console.log('[EditProfile] Photo selected from library');
        }
      } catch (e) {
        console.log('[EditProfile] Library error:', e);
      }
    };

    const takePhoto = async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission Required', 'Please allow camera access.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setAvatarUri(result.assets[0].uri);
          console.log('[EditProfile] Photo taken');
        }
      } catch (e) {
        console.log('[EditProfile] Camera error:', e);
      }
    };

    if (Platform.OS === 'web') {
      pickFromLibrary();
      return;
    }

    showAlert('Change Photo', 'Choose a new profile photo', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const handlePickDocImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setDocImage(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[EditProfile] Doc image error:', e);
    }
  }, []);

  const handleSubmitVerification = useCallback(async () => {
    if (!docName.trim()) {
      showAlert('Error', 'Enter the full name as printed on the document.');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await submitVerification({
        documentType: docType,
        documentName: docName.trim(),
        documentNumber: docNumber.trim() || undefined,
        documentImage: docImage || undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowVerifyForm(false);
      if (updated.verification?.status === 'approved') {
        showAlert('Verified!', 'The name on your document matches your account — you are now verified.');
      } else {
        showAlert('Submitted', 'Your document is under review. Our team will verify it shortly.');
      }
    } catch (e) {
      console.log('[EditProfile] Verification error:', e);
      showAlert('Error', 'Could not submit your document. Please try again.');
    }
  }, [docType, docName, docNumber, docImage, submitVerification]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showAlert('Error', 'Name is required');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updates: { name: string; phone: string; bio: string; dob?: string; country?: string; region?: string; avatar?: string } = {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        dob: dob.trim() || undefined,
        country: country || undefined,
        region: region.trim() || undefined,
      };
      if (avatarUri !== user?.avatar) {
        updates.avatar = avatarUri;
      }
      await updateProfile(updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.log('[EditProfile] Error:', e);
      showAlert('Error', 'Failed to update profile');
    }
  }, [name, phone, bio, dob, country, region, avatarUri, user?.avatar, updateProfile]);

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
          <SafeImage uri={avatarUri} style={styles.avatar} />
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

        <View style={styles.rowTwo}>
          <View style={[styles.inputGroup, styles.halfGroup]}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textLight} testID="edit-dob" />
          </View>
          <View style={[styles.inputGroup, styles.halfGroup]}>
            <Text style={styles.inputLabel}>Region / State</Text>
            <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="e.g. Greater Accra" placeholderTextColor={Colors.textLight} testID="edit-region" />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Country</Text>
          <Pressable style={[styles.input, styles.countrySelector]} onPress={() => setShowCountryPicker(!showCountryPicker)} testID="edit-country">
            <Text style={styles.countryValue}>{country || 'Select country'}</Text>
            <Text style={styles.countryArrow}>{showCountryPicker ? '\u25B2' : '\u25BC'}</Text>
          </Pressable>
          {showCountryPicker && (
            <View style={styles.countryDropdown}>
              <ScrollView nestedScrollEnabled style={styles.countryScrollList} showsVerticalScrollIndicator>
                {countryOptions.map((opt) => (
                  <Pressable
                    key={opt.name}
                    style={[styles.countryOption, country === opt.name && styles.countryOptionActive]}
                    onPress={() => {
                      setCountry(opt.name);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={[styles.countryOptionText, country === opt.name && styles.countryOptionTextActive]}>
                      {opt.flag}  {opt.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
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

        <View style={styles.infoCard}>
          <View style={styles.verifyHeaderRow}>
            <BadgeCheck size={20} color={user.verified ? Colors.success : Colors.textLight} />
            <Text style={styles.infoTitle}>Identity Verification</Text>
          </View>
          {user.verification?.status === 'pending' && (
            <View style={[styles.verifyStatusBox, { backgroundColor: Colors.warning + '14' }]}>
              <Clock size={16} color={Colors.warning} />
              <Text style={[styles.verifyStatusText, { color: Colors.warning }]}>
                Your {user.verification.documentType} is under review. This usually takes a few hours.
              </Text>
            </View>
          )}
          {user.verification?.status === 'rejected' && (
            <View style={[styles.verifyStatusBox, { backgroundColor: Colors.error + '12' }]}>
              <ShieldCheck size={16} color={Colors.error} />
              <Text style={[styles.verifyStatusText, { color: Colors.error }]}>
                Your document was not approved{user.verification.rejectionReason ? `: ${user.verification.rejectionReason}` : ''}. You can submit a clearer one below.
              </Text>
            </View>
          )}
          {(user.verified || user.verification?.status === 'approved') && (
            <View style={[styles.verifyStatusBox, { backgroundColor: Colors.success + '12' }]}>
              <BadgeCheck size={16} color={Colors.success} />
              <Text style={[styles.verifyStatusText, { color: Colors.success }]}>
                Identity verified with your {user.verification?.documentType ?? 'document'}.
              </Text>
            </View>
          )}
          {!user.verified && user.verification?.status !== 'pending' && (
            <View>
              <Text style={styles.verifyHint}>
                Upload a Ghana Card, passport or national ID to earn the verified badge and build trust with renters.
              </Text>
              {!showVerifyForm ? (
                <Pressable style={styles.verifyBtn} onPress={() => setShowVerifyForm(true)} testID="start-verification">
                  <Text style={styles.verifyBtnText}>Verify My Identity</Text>
                </Pressable>
              ) : (
                <View style={styles.verifyForm}>
                  <Text style={styles.inputLabel}>Document Type</Text>
                  <View style={styles.docTypeRow}>
                    {documentTypes.map((dt) => (
                      <Pressable
                        key={dt}
                        style={[styles.docTypeChip, docType === dt && styles.docTypeChipActive]}
                        onPress={() => setDocType(dt)}
                      >
                        <Text style={[styles.docTypeText, docType === dt && styles.docTypeTextActive]}>{dt}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.inputLabel}>Full name on document</Text>
                  <TextInput style={styles.input} value={docName} onChangeText={setDocName} placeholder="Exactly as printed" placeholderTextColor={Colors.textLight} testID="doc-name" />
                  <Text style={styles.verifyHintSmall}>If this matches your account name, verification is instant.</Text>
                  <Text style={styles.inputLabel}>Document number (optional)</Text>
                  <TextInput style={styles.input} value={docNumber} onChangeText={setDocNumber} placeholder="e.g. GHA-123456789-0" placeholderTextColor={Colors.textLight} testID="doc-number" />
                  <Pressable style={styles.docImageBtn} onPress={handlePickDocImage} testID="doc-image">
                    <Camera size={16} color={Colors.primary} />
                    <Text style={styles.docImageText}>{docImage ? 'Photo attached — tap to change' : 'Attach a photo of the document'}</Text>
                  </Pressable>
                  <Pressable style={[styles.verifyBtn, submitVerificationPending && styles.saveBtnDisabled]} onPress={handleSubmitVerification} disabled={submitVerificationPending} testID="submit-verification">
                    {submitVerificationPending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.verifyBtnText}>Submit for Verification</Text>}
                  </Pressable>
                </View>
              )}
            </View>
          )}
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
  rowTwo: { flexDirection: 'row', gap: 12 },
  halfGroup: { flex: 1 },
  countrySelector: { flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between' },
  countryValue: { fontSize: 16, color: Colors.text },
  countryArrow: { fontSize: 12, color: Colors.textSecondary },
  countryDropdown: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  countryScrollList: { maxHeight: 200 },
  countryOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  countryOptionActive: { backgroundColor: Colors.primaryLight },
  countryOptionText: { fontSize: 14, color: Colors.text },
  countryOptionTextActive: { color: Colors.primary, fontWeight: '600' as const },
  verifyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  verifyStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  verifyStatusText: { fontSize: 13, fontWeight: '600' as const, flex: 1, lineHeight: 18 },
  verifyHint: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 12 },
  verifyHintSmall: { fontSize: 12, color: Colors.textLight, marginTop: -2, marginBottom: 8 },
  verifyBtn: { backgroundColor: Colors.primary, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  verifyBtnText: { fontSize: 15, fontWeight: '700' as const, color: Colors.white },
  verifyForm: { marginTop: 4 },
  docTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  docTypeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  docTypeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  docTypeText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  docTypeTextActive: { color: Colors.white },
  docImageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginVertical: 10 },
  docImageText: { fontSize: 13, fontWeight: '600' as const, color: Colors.primary },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
