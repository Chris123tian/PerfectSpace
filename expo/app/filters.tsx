import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  X,
  Building2,
  Home,
  Hotel,
  DoorOpen,
  Check,
  ConciergeBell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { PropertyType, ListingType } from '@/types/property';
import { countryOptions, findCountry } from '@/lib/countries';
import { useFilters } from '@/contexts/FilterContext';

const propertyTypes: { key: PropertyType; label: string; icon: React.ReactNode }[] = [
  { key: 'apartment', label: 'Apartment', icon: <Building2 size={20} color={Colors.categoryApartment} /> },
  { key: 'office', label: 'Office', icon: <Building2 size={20} color={Colors.categoryOffice} /> },
  { key: 'hostel', label: 'Hostel', icon: <Hotel size={20} color={Colors.categoryHostel} /> },
  { key: 'room', label: 'Room', icon: <DoorOpen size={20} color={Colors.categoryRoom} /> },
  { key: 'hotel', label: 'Hotel', icon: <ConciergeBell size={20} color={Colors.categoryHotel} /> },
];

const bedroomOptions = [0, 1, 2, 3, 4];

export default function FiltersScreen() {
  const { filters, applyFilters } = useFilters();
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(filters.types);
  const [listingType, setListingType] = useState<ListingType | null>(filters.listingType);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(filters.bedrooms);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(filters.country);
  const [currency, setCurrency] = useState<string | null>(filters.currency);
  const [minPrice, setMinPrice] = useState<string>(filters.minPrice !== null ? String(filters.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState<string>(filters.maxPrice !== null ? String(filters.maxPrice) : '');

  const handleToggleType = useCallback((type: PropertyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    applyFilters({
      listingType,
      types: selectedTypes,
      country: selectedCountry,
      minPrice: minPrice.trim() ? Number(minPrice) : null,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : null,
      currency,
      bedrooms: selectedBedrooms,
    });
    router.back();
  }, [applyFilters, listingType, selectedTypes, selectedCountry, minPrice, maxPrice, currency, selectedBedrooms]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTypes([]);
    setListingType(null);
    setSelectedBedrooms(null);
    setSelectedCountry(null);
    setCurrency(null);
    setMinPrice('');
    setMaxPrice('');
  }, []);

  const activeCurrency = findCountry(selectedCountry ?? undefined)?.symbol ??
    (currency ? countryOptions.find(c => c.currency === currency)?.symbol : null);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={() => router.back()} testID="close-filters">
            <X size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Filters</Text>
          <Pressable onPress={handleReset} testID="reset-filters">
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
          <View style={styles.pillRow}>
            <Pressable
              style={[styles.pill, listingType === 'rent' && styles.pillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setListingType(prev => prev === 'rent' ? null : 'rent');
              }}
              testID="filter-rent"
            >
              <Text style={[styles.pillText, listingType === 'rent' && styles.pillTextActive]}>
                For Rent
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pill, listingType === 'sale' && styles.pillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setListingType(prev => prev === 'sale' ? null : 'sale');
              }}
              testID="filter-sale"
            >
              <Text style={[styles.pillText, listingType === 'sale' && styles.pillTextActive]}>
                For Sale
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.typeGrid}>
            {propertyTypes.map((type) => (
              <Pressable
                key={type.key}
                style={[
                  styles.typeCard,
                  selectedTypes.includes(type.key) && styles.typeCardActive,
                ]}
                onPress={() => handleToggleType(type.key)}
                testID={`filter-type-${type.key}`}
              >
                {type.icon}
                <Text style={[
                  styles.typeCardText,
                  selectedTypes.includes(type.key) && styles.typeCardTextActive,
                ]}>
                  {type.label}
                </Text>
                {selectedTypes.includes(type.key) && (
                  <View style={styles.typeCheck}>
                    <Check size={14} color={Colors.white} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country</Text>
          <Text style={styles.sectionHint}>Search listings in a specific market</Text>
          <View style={styles.cityGrid}>
            {countryOptions.map((c) => (
              <Pressable
                key={c.name}
                style={[styles.cityChip, selectedCountry === c.name && styles.cityChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCountry(prev => {
                    const next = prev === c.name ? null : c.name;
                    setCurrency(next ? c.currency : null);
                    return next;
                  });
                }}
                testID={`filter-country-${c.name.replace(/\s+/g, '-')}`}
              >
                <Text style={[styles.cityChipText, selectedCountry === c.name && styles.cityChipTextActive]}>
                  {c.flag} {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Price Range{activeCurrency ? ` (${activeCurrency})` : ''}
          </Text>
          <Text style={styles.sectionHint}>
            {selectedCountry
              ? `Prices in ${findCountry(selectedCountry)?.currency ?? ''} — matching listings only`
              : 'Pick a country to filter in its own currency'}
          </Text>
          <View style={styles.customPriceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder={activeCurrency ? `Min ${activeCurrency}` : 'Min'}
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
              testID="min-price-input"
            />
            <View style={styles.priceDash} />
            <TextInput
              style={styles.priceInput}
              placeholder={activeCurrency ? `Max ${activeCurrency}` : 'Max'}
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
              testID="max-price-input"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bedrooms</Text>
          <View style={styles.bedroomRow}>
            {bedroomOptions.map((num) => (
              <Pressable
                key={num}
                style={[styles.bedroomChip, selectedBedrooms === num && styles.bedroomChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBedrooms(prev => prev === num ? null : num);
                }}
                testID={`filter-bed-${num}`}
              >
                <Text style={[styles.bedroomChipText, selectedBedrooms === num && styles.bedroomChipTextActive]}>
                  {num === 0 ? 'Any' : num === 4 ? '4+' : num.toString()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable style={styles.applyButton} onPress={handleApply} testID="apply-filters">
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.white,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeCardText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  typeCardTextActive: {
    color: Colors.primary,
  },
  typeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceDash: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textLight,
    borderRadius: 1,
  },
  bedroomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bedroomChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bedroomChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bedroomChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  bedroomChipTextActive: {
    color: Colors.white,
  },
  cityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  cityChipTextActive: {
    color: Colors.white,
  },
  bottomSpacer: {
    height: 40,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
