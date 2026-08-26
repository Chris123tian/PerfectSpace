import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { X, Building2, Hotel, DoorOpen, ImagePlus, Trash2, ConciergeBell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { PropertyType, ListingType, Property } from '@/types/property';

interface CurrencyOption {
  country: string;
  code: string;
  symbol: string;
}

const currencyOptions: CurrencyOption[] = [
  { country: 'United States', code: 'USD', symbol: '$' },
  { country: 'United Kingdom', code: 'GBP', symbol: '£' },
  { country: 'European Union', code: 'EUR', symbol: '€' },
  { country: 'Canada', code: 'CAD', symbol: 'CA$' },
  { country: 'Australia', code: 'AUD', symbol: 'A$' },
  { country: 'Nigeria', code: 'NGN', symbol: '₦' },
  { country: 'South Africa', code: 'ZAR', symbol: 'R' },
  { country: 'Kenya', code: 'KES', symbol: 'KSh' },
  { country: 'Ghana', code: 'GHS', symbol: 'GH₵' },
  { country: 'India', code: 'INR', symbol: '₹' },
  { country: 'Japan', code: 'JPY', symbol: '¥' },
  { country: 'China', code: 'CNY', symbol: '¥' },
  { country: 'Brazil', code: 'BRL', symbol: 'R$' },
  { country: 'Mexico', code: 'MXN', symbol: 'MX$' },
  { country: 'UAE', code: 'AED', symbol: 'د.إ' },
  { country: 'Saudi Arabia', code: 'SAR', symbol: '﷼' },
  { country: 'Egypt', code: 'EGP', symbol: 'E£' },
  { country: 'Tanzania', code: 'TZS', symbol: 'TSh' },
];

const propertyTypes: { key: PropertyType; label: string; icon: React.ReactNode }[] = [
  { key: 'apartment', label: 'Apartment', icon: <Building2 size={20} color={Colors.categoryApartment} /> },
  { key: 'office', label: 'Office', icon: <Building2 size={20} color={Colors.categoryOffice} /> },
  { key: 'hostel', label: 'Hostel', icon: <Hotel size={20} color={Colors.categoryHostel} /> },
  { key: 'room', label: 'Room', icon: <DoorOpen size={20} color={Colors.categoryRoom} /> },
  { key: 'hotel', label: 'Hotel', icon: <ConciergeBell size={20} color={Colors.categoryHotel} /> },
];

const fallbackImages: Record<PropertyType, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800',
  ],
  hostel: [
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
    'https://images.unsplash.com/photo-1596276020587-8044fe049813?w=800',
    'https://images.unsplash.com/photo-1520277739336-7bf67edfa768?w=800',
  ],
  room: [
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
  ],
};

export default function AddPropertyScreen() {
  const { user } = useAuth();
  const { addProperty } = useData();
  const [loading, setLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<PropertyType>('apartment');
  const [listingType, setListingType] = useState<ListingType>('rent');
  const [price, setPrice] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [bathrooms, setBathrooms] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [amenities, setAmenities] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(currencyOptions[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [showTerms, setShowTerms] = useState<boolean>(false);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 6 - images.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newUris = result.assets.map(a => a.uri);
        setImages(prev => [...prev, ...newUris].slice(0, 6));
        console.log('[AddProperty] Images picked:', newUris.length);
      }
    } catch (e) {
      console.log('[AddProperty] Image pick error:', e);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  }, [images.length]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setImages(prev => [...prev, result.assets[0].uri].slice(0, 6));
        console.log('[AddProperty] Photo taken');
      }
    } catch (e) {
      console.log('[AddProperty] Camera error:', e);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const showImageOptions = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      void pickImage();
      return;
    }
    Alert.alert('Add Photos', 'Choose how to add property images', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage, takePhoto]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    if (!title.trim() || !description.trim() || !price.trim() || !address.trim() || !city.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (!termsAccepted) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Terms & Conditions', 'You must accept the Terms and Conditions before listing a property.');
      return;
    }

    const finalImages = images.length >= 3 ? images : fallbackImages[type];

    if (images.length > 0 && images.length < 3) {
      Alert.alert('More Images Needed', 'Please add at least 3 images for your property, or remove all to use default images.');
      return;
    }

    setLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newProperty: Property = {
        id: 'p_' + Date.now().toString(36),
        title: title.trim(),
        description: description.trim(),
        type,
        listingType,
        price: parseFloat(price) || 0,
        currency: selectedCurrency.symbol,
        period: listingType === 'rent' ? '/mo' : undefined,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 1,
        area: parseInt(area) || 0,
        address: address.trim(),
        city: city.trim(),
        latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
        longitude: -74.006 + (Math.random() - 0.5) * 0.1,
        images: finalImages,
        amenities: amenities.split(',').map(a => a.trim()).filter(Boolean),
        ownerId: user.id,
        ownerName: user.name,
        ownerAvatar: user.avatar,
        rating: 0,
        reviewCount: 0,
        featured: false,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
      };

      console.log('[AddProperty] Submitting property:', newProperty.title, 'with', finalImages.length, 'images');
      await addProperty(newProperty);
      console.log('[AddProperty] Property added successfully');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted for Review', 'Your property has been submitted and will appear on the platform once approved by an admin.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (e) {
      console.log('[AddProperty] Error:', e);
      Alert.alert('Error', 'Failed to add property. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, title, description, type, listingType, price, bedrooms, bathrooms, area, address, city, amenities, images, addProperty, selectedCurrency, termsAccepted]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()} testID="close-add">
            <X size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Property</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Images</Text>
          <Text style={styles.sectionHint}>Add at least 3 photos of your property (max 6)</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
            {images.map((uri, index) => (
              <View key={`img-${index}`} style={styles.imageThumb}>
                <SafeImage uri={uri} style={styles.thumbImage} variant="property" contentFit="cover" />
                <Pressable style={styles.removeImageBtn} onPress={() => removeImage(index)} testID={`remove-img-${index}`}>
                  <Trash2 size={14} color={Colors.white} />
                </Pressable>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < 6 && (
              <Pressable style={styles.addImageBtn} onPress={showImageOptions} testID="add-image">
                <ImagePlus size={28} color={Colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </Pressable>
            )}
          </ScrollView>

          {images.length === 0 && (
            <View style={styles.defaultImagesNote}>
              <Text style={styles.noteText}>No images added — default images for the selected property type will be used.</Text>
            </View>
          )}
          {images.length > 0 && images.length < 3 && (
            <View style={styles.warningNote}>
              <Text style={styles.warningText}>Add at least {3 - images.length} more image{3 - images.length > 1 ? 's' : ''} (minimum 3 required)</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
          <View style={styles.pillRow}>
            <Pressable style={[styles.pill, listingType === 'rent' && styles.pillActive]} onPress={() => setListingType('rent')}>
              <Text style={[styles.pillText, listingType === 'rent' && styles.pillTextActive]}>For Rent</Text>
            </Pressable>
            <Pressable style={[styles.pill, listingType === 'sale' && styles.pillActive]} onPress={() => setListingType('sale')}>
              <Text style={[styles.pillText, listingType === 'sale' && styles.pillTextActive]}>For Sale</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.typeRow}>
            {propertyTypes.map(t => (
              <Pressable key={t.key} style={[styles.typeCard, type === t.key && styles.typeCardActive]} onPress={() => setType(t.key)}>
                {t.icon}
                <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Modern 2BR Apartment" placeholderTextColor={Colors.textLight} testID="property-title" />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe your property..." placeholderTextColor={Colors.textLight} multiline numberOfLines={4} textAlignVertical="top" testID="property-description" />

          <Text style={styles.inputLabel}>Currency & Price *</Text>
          <Pressable
            style={styles.currencySelector}
            onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            testID="currency-selector"
          >
            <Text style={styles.currencyFlag}>{selectedCurrency.symbol}</Text>
            <Text style={styles.currencyLabel}>{selectedCurrency.country} ({selectedCurrency.code})</Text>
            <Text style={styles.currencyArrow}>{showCurrencyPicker ? '\u25B2' : '\u25BC'}</Text>
          </Pressable>
          {showCurrencyPicker && (
            <View style={styles.currencyDropdown}>
              <ScrollView nestedScrollEnabled style={styles.currencyScrollList} showsVerticalScrollIndicator={true}>
                {currencyOptions.map((opt: CurrencyOption) => (
                  <Pressable
                    key={opt.code}
                    style={[
                      styles.currencyOption,
                      selectedCurrency.code === opt.code && styles.currencyOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCurrency(opt);
                      setShowCurrencyPicker(false);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      selectedCurrency.code === opt.code && styles.currencyOptionTextActive,
                    ]}>
                      {opt.symbol}  {opt.country} ({opt.code})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder={listingType === 'rent' ? `Monthly rent in ${selectedCurrency.code}` : `Sale price in ${selectedCurrency.code}`} placeholderTextColor={Colors.textLight} keyboardType="numeric" testID="property-price" />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Bedrooms</Text>
              <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} placeholder="0" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Bathrooms</Text>
              <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} placeholder="1" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
            </View>
          </View>

          <Text style={styles.inputLabel}>Area (sq ft)</Text>
          <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="e.g. 1200" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.inputLabel}>Address *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street address" placeholderTextColor={Colors.textLight} testID="property-address" />

          <Text style={styles.inputLabel}>City *</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="e.g. New York" placeholderTextColor={Colors.textLight} testID="property-city" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <TextInput style={styles.input} value={amenities} onChangeText={setAmenities} placeholder="WiFi, Parking, Pool (comma-separated)" placeholderTextColor={Colors.textLight} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <Pressable
            style={styles.termsBox}
            onPress={() => setShowTerms(!showTerms)}
            testID="toggle-terms"
          >
            <Text style={styles.termsToggleText}>{showTerms ? 'Hide' : 'Read'} Terms & Conditions ▾</Text>
          </Pressable>
          {showTerms && (
            <View style={styles.termsContent}>
              <Text style={styles.termsText}>{`By listing a property on Perfect Space, you agree to the following:\n\n1. Accuracy\nAll property information provided must be accurate, truthful, and up-to-date. Misleading listings will be removed.\n\n2. Ownership & Authorization\nYou confirm you are the owner of the property or are authorized to list it on behalf of the owner.\n\n3. Legal Compliance\nYour listing must comply with all applicable local laws and regulations, including zoning, rental licensing, and fair housing laws.\n\n4. Approval Process\nAll new listings are subject to admin review. Perfect Space reserves the right to reject any listing without providing a reason.\n\n5. Platform Rules\nYou agree not to engage in fraudulent activity, price gouging, or any behavior that may harm other users of the platform.\n\n6. Contact\nFor any queries, contact support@perfectspace.com`}
              </Text>
            </View>
          )}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTermsAccepted(!termsAccepted);
            }}
            testID="terms-checkbox"
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the{' '}
              <Text style={styles.checkboxLabelBold}>Terms and Conditions</Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} testID="submit-property">
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>List Property</Text>}
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
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  imageRow: { gap: 10, paddingVertical: 4 },
  imageThumb: { width: 110, height: 110, borderRadius: 14, overflow: 'hidden', position: 'relative' as const },
  thumbImage: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute' as const, top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  coverBadge: { position: 'absolute' as const, bottom: 6, left: 6, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  coverBadgeText: { fontSize: 10, fontWeight: '700' as const, color: Colors.white },
  addImageBtn: { width: 110, height: 110, borderRadius: 14, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight + '30', gap: 6 },
  addImageText: { fontSize: 12, fontWeight: '600' as const, color: Colors.primary },
  defaultImagesNote: { backgroundColor: Colors.primaryLight + '40', padding: 12, borderRadius: 12, marginTop: 10 },
  noteText: { fontSize: 13, color: Colors.primary, lineHeight: 18 },
  warningNote: { backgroundColor: Colors.warning + '15', padding: 12, borderRadius: 12, marginTop: 10 },
  warningText: { fontSize: 13, color: Colors.warning, fontWeight: '600' as const },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, gap: 6 },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeLabel: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  typeLabelActive: { color: Colors.primary },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  textArea: { height: 100, textAlignVertical: 'top' as const },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  currencySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, gap: 10, marginBottom: 8 },
  currencyFlag: { fontSize: 18, fontWeight: '700' as const, color: Colors.primary },
  currencyLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' as const },
  currencyArrow: { fontSize: 12, color: Colors.textSecondary },
  currencyDropdown: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, overflow: 'hidden' },
  currencyScrollList: { maxHeight: 200 },
  currencyOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  currencyOptionActive: { backgroundColor: Colors.primaryLight },
  currencyOptionText: { fontSize: 14, color: Colors.text },
  currencyOptionTextActive: { color: Colors.primary, fontWeight: '600' as const },
  bottomSpacer: { height: 40 },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
  termsBox: { backgroundColor: Colors.primaryLight + '40', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  termsToggleText: { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  termsContent: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  termsText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { fontSize: 14, fontWeight: '700' as const, color: Colors.white },
  checkboxLabel: { fontSize: 14, color: Colors.text, flex: 1, flexWrap: 'wrap' },
  checkboxLabelBold: { fontWeight: '700' as const, color: Colors.primary },
});
