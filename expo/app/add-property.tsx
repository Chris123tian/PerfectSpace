import React, { useState, useCallback, useMemo } from 'react';
import { showAlert } from '@/lib/alert';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { X, Building2, Hotel, DoorOpen, ImagePlus, Trash2, ConciergeBell, Mail, MessageCircle, CalendarClock, ShieldCheck, RotateCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { PropertyType, ListingType, Property, RentalDurationUnit, BookingChannel } from '@/types/property';
import { countryOptions, defaultCountry, CountryOption } from '@/lib/countries';
import SelectField from '@/components/SelectField';
import { uploadImage, isHostedImage } from '@/lib/upload';
import { regionOptions, townOptions } from '@/lib/regions';

/** A photo in the form: shown from `preview`, saved as `url` once uploaded. */
export interface PhotoSlot {
  key: string;
  preview: string;
  url?: string;
  width?: number;
  height?: number;
  status: 'uploading' | 'done' | 'error';
}

const propertyTypes: { key: PropertyType; label: string; icon: React.ReactNode }[] = [
  { key: 'apartment', label: 'Apartment', icon: <Building2 size={20} color={Colors.categoryApartment} /> },
  { key: 'office', label: 'Office', icon: <Building2 size={20} color={Colors.categoryOffice} /> },
  { key: 'hostel', label: 'Hostel', icon: <Hotel size={20} color={Colors.categoryHostel} /> },
  { key: 'room', label: 'Room', icon: <DoorOpen size={20} color={Colors.categoryRoom} /> },
  { key: 'hotel', label: 'Hotel', icon: <ConciergeBell size={20} color={Colors.categoryHotel} /> },
];

const fallbackImages: Record<PropertyType, string[]> = {
  apartment: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
  office: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
  hostel: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
  room: ['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800'],
  hotel: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
};

const MAX_PHOTOS = 10;

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
  const [region, setRegion] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const { properties } = useData();
  const [amenities, setAmenities] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<CountryOption>(defaultCountry);
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [durationUnit, setDurationUnit] = useState<RentalDurationUnit>('month');
  const [minNights, setMinNights] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactWhatsApp, setContactWhatsApp] = useState<string>('');
  const [bookingChannel, setBookingChannel] = useState<BookingChannel>('in_app');

  const regionChoices = useMemo(
    () => regionOptions(selectedCurrency.name, properties),
    [selectedCurrency.name, properties],
  );
  const townChoices = useMemo(
    () => townOptions(selectedCurrency.name, region || null, properties),
    [selectedCurrency.name, region, properties],
  );
  const countryChoices = useMemo(
    () => countryOptions.map(c => ({ value: c.name, leading: c.flag, hint: `${c.currency} · ${c.symbol}` })),
    [],
  );

  const uploadSlot = useCallback(async (slot: PhotoSlot) => {
    try {
      const url = await uploadImage(slot.preview, 'image', { width: slot.width, height: slot.height });
      setPhotos(prev => prev.map(p => (p.key === slot.key ? { ...p, url, status: 'done' } : p)));
    } catch (e) {
      console.log('[AddProperty] Upload failed:', e);
      setPhotos(prev => prev.map(p => (p.key === slot.key ? { ...p, status: 'error' } : p)));
    }
  }, []);

  // Every picked photo uploads immediately, so what's saved is exactly what was picked.
  const addAssets = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
    const slots: PhotoSlot[] = assets.map((a, i) => ({
      key: `${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      preview: a.uri,
      width: a.width,
      height: a.height,
      status: 'uploading',
    }));
    setPhotos(prev => [...prev, ...slots].slice(0, MAX_PHOTOS));
    slots.forEach(s => void uploadSlot(s));
  }, [uploadSlot]);

  const retrySlot = useCallback((slot: PhotoSlot) => {
    setPhotos(prev => prev.map(p => (p.key === slot.key ? { ...p, status: 'uploading' } : p)));
    void uploadSlot(slot);
  }, [uploadSlot]);

  const pickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: Math.max(1, MAX_PHOTOS - photos.length),
      });

      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addAssets(result.assets);
      }
    } catch (e) {
      console.log('[AddProperty] Image pick error:', e);
      showAlert('Error', 'Failed to pick images. Please try again.');
    }
  }, [photos.length, addAssets]);

  const takePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please allow camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        addAssets([result.assets[0]]);
      }
    } catch (e) {
      console.log('[AddProperty] Camera error:', e);
      showAlert('Error', 'Failed to take photo. Please try again.');
    }
  }, [addAssets]);

  const removeImage = useCallback((key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos(prev => prev.filter(p => p.key !== key));
  }, []);

  const showImageOptions = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      void pickImage();
      return;
    }
    showAlert('Add Photos', 'Choose how to add property images', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Photo Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage, takePhoto]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    if (!title.trim() || !description.trim() || !price.trim() || !address.trim() || !city.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showAlert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (photos.some(p => p.status === 'uploading')) {
      showAlert('Photos still uploading', 'Please wait a moment for your photos to finish uploading.');
      return;
    }
    if (photos.some(p => p.status === 'error')) {
      showAlert('Some photos failed', 'Tap a failed photo to retry, or remove it before listing.');
      return;
    }
    const uploaded = photos.map(p => p.url).filter((u): u is string => isHostedImage(u));
    // Stock photo only when the owner added none at all.
    const finalImages = uploaded.length > 0 ? uploaded : fallbackImages[type];
    const isHotel = type === 'hotel';
    let period: string | undefined;
    let unit: RentalDurationUnit | undefined;
    if (listingType === 'rent') {
      if (isHotel) {
        period = '/night';
        unit = 'night';
      } else if (durationUnit === 'year') {
        period = '/yr';
        unit = 'year';
      } else {
        period = '/mo';
        unit = 'month';
      }
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
        period,
        durationUnit: unit,
        minNights: isHotel ? (parseInt(minNights) || undefined) : undefined,
        country: selectedCurrency.name,
        contactEmail: contactEmail.trim() || undefined,
        contactWhatsApp: contactWhatsApp.trim() || undefined,
        bookingChannel,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 1,
        area: parseInt(area) || 0,
        address: address.trim(),
        city: city.trim(),
        region: region.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
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
      showAlert('Submitted for Review', 'Your property has been submitted and will appear on the platform once approved by an admin.', [
        { text: 'OK', onPress: () => goBack() },
      ]);
    } catch (e) {
      console.log('[AddProperty] Error:', e);
      showAlert('Error', e instanceof Error ? e.message : 'Failed to add property. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, title, description, type, listingType, price, bedrooms, bathrooms, area, address, city, region, neighborhood, amenities, photos, addProperty, selectedCurrency, durationUnit, minNights, contactEmail, contactWhatsApp, bookingChannel]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => goBack()} testID="close-add">
            <X size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Add Property</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Images</Text>
          <Text style={styles.sectionHint}>Add photos from your device (up to {MAX_PHOTOS}). The first one is the cover.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
            {photos.map((photo, index) => (
              <View key={photo.key} style={styles.imageThumb} testID={`photo-${index}`}>
                <SafeImage uri={photo.url ?? photo.preview} style={styles.thumbImage} contentFit="cover" />
                {photo.status === 'uploading' && (
                  <View style={styles.thumbOverlay} testID={`photo-uploading-${index}`}>
                    <ActivityIndicator color={Colors.white} />
                    <Text style={styles.thumbOverlayText}>Uploading</Text>
                  </View>
                )}
                {photo.status === 'error' && (
                  <Pressable style={[styles.thumbOverlay, styles.thumbError]} onPress={() => retrySlot(photo)} testID={`photo-retry-${index}`}>
                    <RotateCw size={18} color={Colors.white} />
                    <Text style={styles.thumbOverlayText}>Tap to retry</Text>
                  </Pressable>
                )}
                <Pressable style={styles.removeImageBtn} onPress={() => removeImage(photo.key)} testID={`remove-img-${index}`}>
                  <Trash2 size={14} color={Colors.white} />
                </Pressable>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={styles.addImageBtn} onPress={showImageOptions} testID="add-image">
                <ImagePlus size={28} color={Colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </Pressable>
            )}
          </ScrollView>

          {photos.length === 0 && (
            <View style={styles.defaultImagesNote}>
              <Text style={styles.noteText}>Listings with real photos get far more inquiries. If you add none, a generic placeholder photo is shown.</Text>
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

          <Text style={styles.inputLabel}>Country & Price *</Text>
          <SelectField
            value={selectedCurrency.name}
            options={countryChoices}
            title="Country"
            onChange={(v) => {
              const next = countryOptions.find(c => c.name === v);
              if (!next) return;
              setSelectedCurrency(next);
              setRegion('');
              setCity('');
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            displayValue={`${selectedCurrency.flag}  ${selectedCurrency.name} · ${selectedCurrency.symbol} (${selectedCurrency.currency})`}
            testID="currency-selector"
          />
          <View style={{ height: 10 }} />
          <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder={listingType === 'rent' ? (type === 'hotel' ? `Price per night in ${selectedCurrency.currency}` : durationUnit === 'year' ? `Yearly rent in ${selectedCurrency.currency}` : `Monthly rent in ${selectedCurrency.currency}`) : `Sale price in ${selectedCurrency.currency}`} placeholderTextColor={Colors.textLight} keyboardType="numeric" testID="property-price" />

          {listingType === 'rent' && type !== 'hotel' && (
            <View style={styles.durationBlock}>
              <Text style={styles.inputLabel}>Rental Duration</Text>
              <View style={styles.pillRow}>
                <Pressable
                  style={[styles.pill, durationUnit === 'month' && styles.pillActive]}
                  onPress={() => setDurationUnit('month')}
                  testID="duration-month"
                >
                  <CalendarClock size={16} color={durationUnit === 'month' ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.pillText, durationUnit === 'month' && styles.pillTextActive]}>Per Month</Text>
                </Pressable>
                <Pressable
                  style={[styles.pill, durationUnit === 'year' && styles.pillActive]}
                  onPress={() => setDurationUnit('year')}
                  testID="duration-year"
                >
                  <CalendarClock size={16} color={durationUnit === 'year' ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.pillText, durationUnit === 'year' && styles.pillTextActive]}>Per Year</Text>
                </Pressable>
              </View>
            </View>
          )}

          {type === 'hotel' && (
            <View style={styles.durationBlock}>
              <Text style={styles.sectionHint}>Hotel rooms are priced per night.</Text>
              <Text style={styles.inputLabel}>Minimum Nights (optional)</Text>
              <TextInput style={styles.input} value={minNights} onChangeText={setMinNights} placeholder="e.g. 2" placeholderTextColor={Colors.textLight} keyboardType="numeric" testID="min-nights" />
            </View>
          )}

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

          <Text style={styles.inputLabel}>Region / State</Text>
          <SelectField
            value={region}
            options={regionChoices}
            title={`Regions in ${selectedCurrency.name}`}
            placeholder="Select a region"
            allowCustom
            onChange={(v) => { setRegion(v ?? ''); setCity(''); }}
            testID="property-region"
          />
          {regionChoices.length > 0 && !region && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionChips} keyboardShouldPersistTaps="handled">
              {regionChoices.slice(0, 8).map(r => (
                <Pressable
                  key={r}
                  style={styles.regionChip}
                  onPress={() => setRegion(r)}
                  testID={`property-region-${r.replace(/\s+/g, '-')}`}
                >
                  <Text style={styles.regionChipText}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text style={styles.inputLabel}>Town / City *</Text>
          <SelectField
            value={city}
            options={townChoices}
            title={region ? `Towns in ${region}` : `Towns in ${selectedCurrency.name}`}
            placeholder="Select a town"
            allowCustom
            onChange={(v) => setCity(v ?? '')}
            testID="property-city"
          />

          <Text style={styles.inputLabel}>Neighbourhood / Area</Text>
          <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="e.g. East Legon" placeholderTextColor={Colors.textLight} testID="property-neighborhood" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <TextInput style={styles.input} value={amenities} onChangeText={setAmenities} placeholder="WiFi, Parking, Pool (comma-separated)" placeholderTextColor={Colors.textLight} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Bookings</Text>
          <Text style={styles.sectionHint}>Optional — shown on the listing so renters can reach you directly.</Text>
          <View style={styles.contactRow}>
            <Mail size={18} color={Colors.textSecondary} />
            <TextInput style={styles.contactInput} value={contactEmail} onChangeText={setContactEmail} placeholder="Contact email" placeholderTextColor={Colors.textLight} autoCapitalize="none" keyboardType="email-address" testID="contact-email" />
          </View>
          <View style={styles.contactRow}>
            <MessageCircle size={18} color={Colors.textSecondary} />
            <TextInput style={styles.contactInput} value={contactWhatsApp} onChangeText={setContactWhatsApp} placeholder="WhatsApp number (e.g. +233 555 000 0000)" placeholderTextColor={Colors.textLight} keyboardType="phone-pad" testID="contact-whatsapp" />
          </View>

          <Text style={styles.inputLabel}>How should renters book?</Text>
          <View style={styles.pillRow}>
            <Pressable style={[styles.pill, bookingChannel === 'in_app' && styles.pillActive]} onPress={() => setBookingChannel('in_app')} testID="channel-in-app">
              <Text style={[styles.pillText, bookingChannel === 'in_app' && styles.pillTextActive]}>In-app bookings</Text>
            </Pressable>
            <Pressable style={[styles.pill, bookingChannel === 'whatsapp' && styles.pillActive]} onPress={() => setBookingChannel('whatsapp')} testID="channel-whatsapp">
              <Text style={[styles.pillText, bookingChannel === 'whatsapp' && styles.pillTextActive]}>Via WhatsApp</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.disclaimerCard}>
            <ShieldCheck size={18} color={Colors.primary} />
            <View style={styles.disclaimerTextWrap}>
              <Text style={styles.disclaimerTitle}>Owner Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                Perfect Space is a listings marketplace, not an agent or payment processor. You are solely responsible for the accuracy of your listing, screening renters, and signing your own tenancy agreements. Never ask for or accept payments outside agreed channels, and treat every inquiry with due diligence.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable style={[styles.submitBtn, (loading || photos.some(p => p.status === 'uploading')) && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} testID="submit-property">
          {loading ? <ActivityIndicator color={Colors.white} /> : (
            <Text style={styles.submitText}>
              {photos.some(p => p.status === 'uploading') ? 'Uploading photos…' : 'List Property'}
            </Text>
          )}
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
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  thumbError: { backgroundColor: 'rgba(185,28,28,0.65)' },
  thumbOverlayText: { fontSize: 11, fontWeight: '700' as const, color: Colors.white },
  regionChips: { gap: 8, paddingTop: 8 },
  regionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  regionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  regionChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  regionChipTextActive: { color: Colors.white },
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
  pill: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
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
  durationBlock: { marginTop: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, marginBottom: 10 },
  contactInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 15, color: Colors.text },
  disclaimerCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.primaryLight + '55', borderWidth: 1, borderColor: Colors.primary + '35', borderRadius: 16, padding: 16 },
  disclaimerTextWrap: { flex: 1 },
  disclaimerTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, marginBottom: 4 },
  disclaimerText: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  bottomBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { fontSize: 17, fontWeight: '700' as const, color: Colors.white },
});
