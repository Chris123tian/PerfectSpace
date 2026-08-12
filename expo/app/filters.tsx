import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  X,
  Building2,
  Hotel,
  DoorOpen,
  Check,
  ConciergeBell,
  Globe,
  ChevronDown,
  Search,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { PropertyType, ListingType } from '@/types/property';
import { useData } from '@/contexts/DataContext';

const propertyTypes: { key: PropertyType; label: string; icon: React.ReactNode }[] = [
  { key: 'apartment', label: 'Apartment', icon: <Building2 size={20} color={Colors.categoryApartment} /> },
  { key: 'office',    label: 'Office',    icon: <Building2 size={20} color={Colors.categoryOffice} /> },
  { key: 'hostel',    label: 'Hostel',    icon: <Hotel size={20} color={Colors.categoryHostel} /> },
  { key: 'room',      label: 'Room',      icon: <DoorOpen size={20} color={Colors.categoryRoom} /> },
  { key: 'hotel',     label: 'Hotel',     icon: <ConciergeBell size={20} color={Colors.categoryHotel} /> },
];

const bedroomOptions = [0, 1, 2, 3, 4];

// ── Country → { currency symbol, cities } ────────────────────────────────────
const COUNTRY_DATA: Record<string, { symbol: string; cities: string[] }> = {
  'Any':                    { symbol: '$',   cities: ['Any'] },
  // Non-African
  'United States':          { symbol: '$',   cities: ['Any', 'New York', 'San Francisco', 'Boston', 'Austin', 'Chicago'] },
  'United Kingdom':         { symbol: '£',   cities: ['Any', 'London', 'Manchester', 'Birmingham'] },
  'France':                 { symbol: '€',   cities: ['Any', 'Paris', 'Lyon', 'Marseille'] },
  'Germany':                { symbol: '€',   cities: ['Any', 'Berlin', 'Munich', 'Hamburg'] },
  'Canada':                 { symbol: 'CA$', cities: ['Any', 'Toronto', 'Vancouver', 'Montreal'] },
  'Australia':              { symbol: 'A$',  cities: ['Any', 'Sydney', 'Melbourne', 'Brisbane'] },
  // ── African Countries ───────────────────────────────────────────────────────
  'Algeria':                { symbol: 'DA',  cities: ['Any', 'Algiers', 'Oran', 'Constantine'] },
  'Angola':                 { symbol: 'Kz',  cities: ['Any', 'Luanda', 'Huambo', 'Lobito'] },
  'Benin':                  { symbol: 'CFA', cities: ['Any', 'Cotonou', 'Porto-Novo', 'Parakou'] },
  'Botswana':               { symbol: 'BWP', cities: ['Any', 'Gaborone', 'Francistown', 'Molepolole'] },
  'Burkina Faso':           { symbol: 'CFA', cities: ['Any', 'Ouagadougou', 'Bobo-Dioulasso'] },
  'Burundi':                { symbol: 'BIF', cities: ['Any', 'Bujumbura', 'Gitega'] },
  'Cabo Verde':             { symbol: 'CVE', cities: ['Any', 'Praia', 'Mindelo'] },
  'Cameroon':               { symbol: 'CFA', cities: ['Any', 'Douala', 'Yaoundé', 'Bamenda'] },
  'Central African Republic':{ symbol: 'CFA',cities: ['Any', 'Bangui'] },
  'Chad':                   { symbol: 'CFA', cities: ['Any', "N'Djamena", 'Moundou'] },
  'Comoros':                { symbol: 'KMF', cities: ['Any', 'Moroni'] },
  'DR Congo':               { symbol: 'CDF', cities: ['Any', 'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi'] },
  'Republic of Congo':      { symbol: 'CFA', cities: ['Any', 'Brazzaville', 'Pointe-Noire'] },
  "Côte d'Ivoire":          { symbol: 'CFA', cities: ['Any', 'Abidjan', 'Bouaké', 'Yamoussoukro'] },
  'Djibouti':               { symbol: 'DJF', cities: ['Any', 'Djibouti City'] },
  'Egypt':                  { symbol: 'EGP', cities: ['Any', 'Cairo', 'Alexandria', 'Giza'] },
  'Equatorial Guinea':      { symbol: 'CFA', cities: ['Any', 'Malabo', 'Bata'] },
  'Eritrea':                { symbol: 'ERN', cities: ['Any', 'Asmara'] },
  'Eswatini':               { symbol: 'SZL', cities: ['Any', 'Mbabane', 'Manzini'] },
  'Ethiopia':               { symbol: 'ETB', cities: ['Any', 'Addis Ababa', 'Dire Dawa', 'Mekelle'] },
  'Gabon':                  { symbol: 'CFA', cities: ['Any', 'Libreville', 'Port-Gentil'] },
  'Gambia':                 { symbol: 'GMD', cities: ['Any', 'Banjul', 'Serekunda'] },
  'Ghana':                  { symbol: 'GHS', cities: ['Any', 'Accra', 'Kumasi', 'Tamale'] },
  'Guinea':                 { symbol: 'GNF', cities: ['Any', 'Conakry', 'Nzérékoré'] },
  'Guinea-Bissau':          { symbol: 'CFA', cities: ['Any', 'Bissau'] },
  'Kenya':                  { symbol: 'KES', cities: ['Any', 'Nairobi', 'Mombasa', 'Kisumu'] },
  'Lesotho':                { symbol: 'LSL', cities: ['Any', 'Maseru'] },
  'Liberia':                { symbol: 'LRD', cities: ['Any', 'Monrovia'] },
  'Libya':                  { symbol: 'LYD', cities: ['Any', 'Tripoli', 'Benghazi', 'Misrata'] },
  'Madagascar':             { symbol: 'MGA', cities: ['Any', 'Antananarivo', 'Toamasina'] },
  'Malawi':                 { symbol: 'MWK', cities: ['Any', 'Lilongwe', 'Blantyre', 'Mzuzu'] },
  'Mali':                   { symbol: 'CFA', cities: ['Any', 'Bamako', 'Sikasso', 'Mopti'] },
  'Mauritania':             { symbol: 'MRU', cities: ['Any', 'Nouakchott', 'Nouadhibou'] },
  'Mauritius':              { symbol: 'MUR', cities: ['Any', 'Port Louis', 'Beau Bassin', 'Vacoas'] },
  'Morocco':                { symbol: 'MAD', cities: ['Any', 'Casablanca', 'Rabat', 'Marrakech', 'Fes'] },
  'Mozambique':             { symbol: 'MZN', cities: ['Any', 'Maputo', 'Matola', 'Beira'] },
  'Namibia':                { symbol: 'NAD', cities: ['Any', 'Windhoek', 'Walvis Bay', 'Swakopmund'] },
  'Niger':                  { symbol: 'CFA', cities: ['Any', 'Niamey', 'Zinder', 'Maradi'] },
  'Nigeria':                { symbol: '₦',   cities: ['Any', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu'] },
  'Rwanda':                 { symbol: 'RWF', cities: ['Any', 'Kigali', 'Butare', 'Gisenyi'] },
  'São Tomé and Príncipe':  { symbol: 'STN', cities: ['Any', 'São Tomé'] },
  'Senegal':                { symbol: 'CFA', cities: ['Any', 'Dakar', 'Touba', 'Thiès'] },
  'Seychelles':             { symbol: 'SCR', cities: ['Any', 'Victoria'] },
  'Sierra Leone':           { symbol: 'SLL', cities: ['Any', 'Freetown', 'Bo', 'Kenema'] },
  'Somalia':                { symbol: 'SOS', cities: ['Any', 'Mogadishu', 'Hargeisa', 'Bosaso'] },
  'South Africa':           { symbol: 'R',   cities: ['Any', 'Johannesburg', 'Cape Town', 'Durban', 'Pretoria'] },
  'South Sudan':            { symbol: 'SSP', cities: ['Any', 'Juba', 'Wau', 'Malakal'] },
  'Sudan':                  { symbol: 'SDG', cities: ['Any', 'Khartoum', 'Omdurman', 'Port Sudan'] },
  'Tanzania':               { symbol: 'TZS', cities: ['Any', 'Dar es Salaam', 'Dodoma', 'Mwanza', 'Zanzibar'] },
  'Togo':                   { symbol: 'CFA', cities: ['Any', 'Lomé', 'Sokodé', 'Kara'] },
  'Tunisia':                { symbol: 'TND', cities: ['Any', 'Tunis', 'Sfax', 'Sousse'] },
  'Uganda':                 { symbol: 'UGX', cities: ['Any', 'Kampala', 'Gulu', 'Mbarara'] },
  'Zambia':                 { symbol: 'ZMW', cities: ['Any', 'Lusaka', 'Kitwe', 'Ndola'] },
  'Zimbabwe':               { symbol: 'ZWL', cities: ['Any', 'Harare', 'Bulawayo', 'Chitungwiza'] },
};

const ALL_COUNTRIES = Object.keys(COUNTRY_DATA);

const getPriceRanges = (symbol: string) => [
  { label: 'Any',                             min: 0,    max: Infinity },
  { label: `${symbol}0 – ${symbol}500`,       min: 0,    max: 500 },
  { label: `${symbol}500 – ${symbol}1,000`,   min: 500,  max: 1000 },
  { label: `${symbol}1,000 – ${symbol}2,000`, min: 1000, max: 2000 },
  { label: `${symbol}2,000 – ${symbol}5,000`, min: 2000, max: 5000 },
  { label: `${symbol}5,000+`,                 min: 5000, max: Infinity },
];

// ── Dropdown component ────────────────────────────────────────────────────────
function CountryDropdown({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (country: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = ALL_COUNTRIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (country: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(country);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Pressable
        style={styles.dropdownTrigger}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpen(true); }}
        testID="country-dropdown-trigger"
      >
        <Globe size={16} color={Colors.primary} />
        <Text style={styles.dropdownTriggerText} numberOfLines={1}>
          {selected === 'Any' ? 'Any country' : selected}
        </Text>
        <ChevronDown size={16} color={Colors.textSecondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['top', 'bottom']} style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => { setOpen(false); setSearch(''); }}
                testID="close-country-dropdown"
              >
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.modalSearchRow}>
              <Search size={16} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search country..."
                placeholderTextColor={Colors.textLight}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <X size={16} color={Colors.textLight} />
                </Pressable>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selected === item;
                return (
                  <Pressable
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => handleSelect(item)}
                    testID={`country-option-${item}`}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                      {item === 'Any' ? '🌍  Any Country' : item}
                    </Text>
                    {isSelected && <Check size={16} color={Colors.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>No countries found</Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function FiltersScreen() {
  const { filters, updateFilters, resetFilters } = useData();

  const [selectedCountry, setSelectedCountry]       = useState<string>(filters.country ?? 'Any');
  const [selectedCity, setSelectedCity]             = useState<string>(filters.city ?? 'Any');
  const [selectedTypes, setSelectedTypes]           = useState<PropertyType[]>(filters.type ? [filters.type] : []);
  const [listingType, setListingType]               = useState<ListingType | null>(filters.listingType ?? null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number>(0);
  const [selectedBedrooms, setSelectedBedrooms]     = useState<number | null>(
    filters.bedrooms !== undefined ? filters.bedrooms : null
  );
  const [minPrice, setMinPrice] = useState<string>(
    filters.minPrice !== undefined ? String(filters.minPrice) : ''
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    filters.maxPrice !== undefined && filters.maxPrice !== Infinity ? String(filters.maxPrice) : ''
  );

  const countryInfo     = COUNTRY_DATA[selectedCountry] ?? COUNTRY_DATA['Any'];
  const currencySymbol  = countryInfo.symbol;
  const availableCities = countryInfo.cities;
  const priceRanges     = getPriceRanges(currencySymbol);

  // Reset city when country changes if city no longer valid
  useEffect(() => {
    if (!availableCities.includes(selectedCity)) {
      setSelectedCity('Any');
    }
  }, [selectedCountry]);

  const handleToggleType = useCallback((type: PropertyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const priceRange = priceRanges[selectedPriceRange];
    const customMin  = minPrice.trim() ? parseFloat(minPrice) : undefined;
    const customMax  = maxPrice.trim() ? parseFloat(maxPrice) : undefined;
    const effectiveMin = customMin !== undefined ? customMin : (priceRange.min > 0 ? priceRange.min : undefined);
    const effectiveMax = customMax !== undefined ? customMax : (priceRange.max !== Infinity ? priceRange.max : undefined);

    updateFilters({
      country:     selectedCountry !== 'Any' ? selectedCountry : undefined,
      city:        selectedCity    !== 'Any' ? selectedCity    : undefined,
      type:        selectedTypes.length === 1 ? selectedTypes[0] : undefined,
      listingType: listingType ?? undefined,
      minPrice:    effectiveMin,
      maxPrice:    effectiveMax,
      bedrooms:    selectedBedrooms !== null && selectedBedrooms > 0 ? selectedBedrooms : undefined,
    });
    router.back();
  }, [
    selectedCountry, selectedCity, selectedTypes, listingType,
    selectedPriceRange, selectedBedrooms, minPrice, maxPrice,
    priceRanges, updateFilters,
  ]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCountry('Any');
    setSelectedCity('Any');
    setSelectedTypes([]);
    setListingType(null);
    setSelectedPriceRange(0);
    setSelectedBedrooms(null);
    setMinPrice('');
    setMaxPrice('');
    resetFilters();
  }, [resetFilters]);

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

        {/* ── Country Dropdown ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country</Text>
          <CountryDropdown
            selected={selectedCountry}
            onSelect={(c) => { setSelectedCountry(c); }}
          />
        </View>

        {/* ── City (dynamic per country) ── */}
        {availableCities.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>City</Text>
            <View style={styles.cityGrid}>
              {availableCities.map((city) => (
                <Pressable
                  key={city}
                  style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCity(city);
                  }}
                  testID={`filter-city-${city}`}
                >
                  <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                    {city}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* ── Listing Type ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listing Type</Text>
          <View style={styles.pillRow}>
            <Pressable
              style={[styles.pill, listingType === 'rent' && styles.pillActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setListingType(prev => prev === 'rent' ? null : 'rent'); }}
              testID="filter-rent"
            >
              <Text style={[styles.pillText, listingType === 'rent' && styles.pillTextActive]}>For Rent</Text>
            </Pressable>
            <Pressable
              style={[styles.pill, listingType === 'sale' && styles.pillActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setListingType(prev => prev === 'sale' ? null : 'sale'); }}
              testID="filter-sale"
            >
              <Text style={[styles.pillText, listingType === 'sale' && styles.pillTextActive]}>For Sale</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Property Type ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Type</Text>
          <View style={styles.typeGrid}>
            {propertyTypes.map((type) => (
              <Pressable
                key={type.key}
                style={[styles.typeCard, selectedTypes.includes(type.key) && styles.typeCardActive]}
                onPress={() => handleToggleType(type.key)}
                testID={`filter-type-${type.key}`}
              >
                {type.icon}
                <Text style={[styles.typeCardText, selectedTypes.includes(type.key) && styles.typeCardTextActive]}>
                  {type.label}
                </Text>
                {selectedTypes.includes(type.key) && (
                  <View style={styles.typeCheck}><Check size={14} color={Colors.white} /></View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Price Range ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          {selectedCountry !== 'Any' && (
            <Text style={styles.currencyNote}>Currency: {currencySymbol}</Text>
          )}
          <View style={styles.priceRangeGrid}>
            {priceRanges.map((range, idx) => (
              <Pressable
                key={idx}
                style={[styles.priceChip, selectedPriceRange === idx && styles.priceChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPriceRange(idx); }}
                testID={`filter-price-${idx}`}
              >
                <Text style={[styles.priceChipText, selectedPriceRange === idx && styles.priceChipTextActive]}>
                  {range.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.customPriceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder={`Min ${currencySymbol}`}
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
              testID="min-price-input"
            />
            <View style={styles.priceDash} />
            <TextInput
              style={styles.priceInput}
              placeholder={`Max ${currencySymbol}`}
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
              testID="max-price-input"
            />
          </View>
        </View>

        {/* ── Bedrooms ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bedrooms</Text>
          <View style={styles.bedroomRow}>
            {bedroomOptions.map((num) => (
              <Pressable
                key={num}
                style={[styles.bedroomChip, selectedBedrooms === num && styles.bedroomChipActive]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedBedrooms(prev => prev === num ? null : num); }}
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
  container:       { flex: 1, backgroundColor: Colors.background },
  safeArea:        { backgroundColor: Colors.white },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  closeButton:     { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  resetText:       { fontSize: 14, fontWeight: '600' as const, color: Colors.primary },
  scrollContent:   { padding: 20 },
  section:         { marginBottom: 28 },
  sectionTitle:    { fontSize: 17, fontWeight: '700' as const, color: Colors.text, marginBottom: 12 },
  currencyNote:    { fontSize: 12, color: Colors.textSecondary, marginTop: -8, marginBottom: 10, fontWeight: '500' as const },

  // ── Dropdown trigger ──────────────────────────────────────────────────────
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownTriggerText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' as const },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer:  { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle:      { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  modalCloseBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  modalSearchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8, backgroundColor: Colors.background, borderRadius: 12 },
  modalSearchInput:{ flex: 1, fontSize: 15, color: Colors.text },
  dropdownItem:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight + '60' },
  dropdownItemActive: { backgroundColor: Colors.primaryLight },
  dropdownItemText:{ fontSize: 15, color: Colors.text },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: '600' as const },
  emptySearch:     { alignItems: 'center', paddingVertical: 40 },
  emptySearchText: { fontSize: 15, color: Colors.textSecondary },

  pillRow:         { flexDirection: 'row', gap: 10 },
  pill:            { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  pillActive:      { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText:        { fontSize: 15, fontWeight: '600' as const, color: Colors.textSecondary },
  pillTextActive:  { color: Colors.white },

  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard:        { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, position: 'relative' },
  typeCardActive:  { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeCardText:    { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  typeCardTextActive: { color: Colors.primary },
  typeCheck:       { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  priceRangeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  priceChip:       { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  priceChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  priceChipText:   { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  priceChipTextActive: { color: Colors.white },
  customPriceRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput:      { flex: 1, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  priceDash:       { width: 16, height: 2, backgroundColor: Colors.textLight, borderRadius: 1 },

  bedroomRow:      { flexDirection: 'row', gap: 10 },
  bedroomChip:     { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  bedroomChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bedroomChipText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  bedroomChipTextActive: { color: Colors.white },

  cityGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cityChip:        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  cityChipActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cityChipText:    { fontSize: 14, fontWeight: '500' as const, color: Colors.textSecondary },
  cityChipTextActive: { color: Colors.white },

  bottomSpacer:    { height: 40 },
  bottomBar:       { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingHorizontal: 20, paddingTop: 12 },
  applyButton:     { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyButtonText: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
});
