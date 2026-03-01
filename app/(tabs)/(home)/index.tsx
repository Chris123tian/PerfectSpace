import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Animated,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, SlidersHorizontal, Building2, Home, Hotel, DoorOpen, ChevronRight, Plus, ConciergeBell, Star, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { PropertyType } from '@/types/property';
import PropertyCard from '@/components/PropertyCard';

const categories: { key: PropertyType | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All', icon: <Home size={20} color={Colors.white} />, color: Colors.primary },
  { key: 'apartment', label: 'Apartments', icon: <Building2 size={20} color={Colors.white} />, color: Colors.categoryApartment },
  { key: 'office', label: 'Offices', icon: <Building2 size={20} color={Colors.white} />, color: Colors.categoryOffice },
  { key: 'hostel', label: 'Hostels', icon: <Hotel size={20} color={Colors.white} />, color: Colors.categoryHostel },
  { key: 'room', label: 'Rooms', icon: <DoorOpen size={20} color={Colors.white} />, color: Colors.categoryRoom },
  { key: 'hotel', label: 'Hotels', icon: <ConciergeBell size={20} color={Colors.white} />, color: Colors.categoryHotel },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - 40;
const SLIDE_SPACING = 12;

export default function HomeScreen() {
  const { user } = useAuth();
  const { activeProperties } = useData();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PropertyType | 'all'>('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState<number>(0);
  const featuredScrollRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleCategoryPress = useCallback((key: PropertyType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
  }, []);

  const filteredProperties = useMemo(() => {
    let result = activeProperties;
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.type === selectedCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          p.city.toLowerCase().includes(query) ||
          p.address.toLowerCase().includes(query)
      );
    }
    return result;
  }, [selectedCategory, searchQuery, activeProperties]);

  const featuredProperties = useMemo(() => activeProperties.filter(p => p.featured), [activeProperties]);

  useEffect(() => {
    if (featuredProperties.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setActiveFeaturedIndex(prev => {
        const next = (prev + 1) % featuredProperties.length;
        featuredScrollRef.current?.scrollToOffset({
          offset: next * (SLIDE_WIDTH + SLIDE_SPACING),
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [featuredProperties.length]);

  const handleFeaturedScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (SLIDE_WIDTH + SLIDE_SPACING));
    setActiveFeaturedIndex(index);
  }, []);

  const handleFeaturedTouchStart = useCallback(() => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
  }, []);

  const handleFeaturedTouchEnd = useCallback(() => {
    if (featuredProperties.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setActiveFeaturedIndex(prev => {
        const next = (prev + 1) % featuredProperties.length;
        featuredScrollRef.current?.scrollToOffset({
          offset: next * (SLIDE_WIDTH + SLIDE_SPACING),
          animated: true,
        });
        return next;
      });
    }, 4000);
  }, [featuredProperties.length]);

  const formatFeaturedPrice = useCallback((price: number, currency: string, period?: string) => {
    const formatted = price >= 1000000 ? `${(price / 1000000).toFixed(1)}M` : price.toLocaleString();
    return `${currency}${formatted}${period ?? ''}`;
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting}, {user?.name?.split(' ')[0] ?? 'there'}</Text>
              <Text style={styles.greetingBold}>Perfect Space</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/profile')} testID="header-avatar">
              <Image
                source={{ uri: user?.avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                style={styles.avatar}
              />
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by location, type..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                testID="search-input"
              />
            </View>
            <Pressable style={styles.filterButton} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/filters'); }} testID="filter-button">
              <SlidersHorizontal size={20} color={Colors.white} />
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {user?.role === 'landlord' && (
          <Pressable
            style={styles.addPropertyBanner}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/add-property'); }}
            testID="add-property-banner"
          >
            <View style={styles.addPropertyLeft}>
              <Plus size={20} color={Colors.white} />
              <View>
                <Text style={styles.addPropertyTitle}>List a Property</Text>
                <Text style={styles.addPropertySubtitle}>Reach thousands of renters</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.white} />
          </Pressable>
        )}

        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.key && { backgroundColor: cat.color },
                  selectedCategory !== cat.key && styles.categoryChipInactive,
                ]}
                testID={`category-${cat.key}`}
              >
                <View style={[
                  styles.categoryIcon,
                  selectedCategory === cat.key
                    ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                    : { backgroundColor: cat.color + '15' },
                ]}>
                  {selectedCategory === cat.key
                    ? React.cloneElement(cat.icon as React.ReactElement<{ color: string; size: number }>, { color: Colors.white, size: 16 })
                    : React.cloneElement(cat.icon as React.ReactElement<{ color: string; size: number }>, { color: cat.color, size: 16 })
                  }
                </View>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat.key
                      ? styles.categoryTextActive
                      : { color: Colors.textSecondary },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {featuredProperties.length > 0 && selectedCategory === 'all' && !searchQuery.trim() && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured</Text>
              <View style={styles.slideDots}>
                {featuredProperties.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.slideDot,
                      activeFeaturedIndex === idx && styles.slideDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <FlatList
              ref={featuredScrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={SLIDE_WIDTH + SLIDE_SPACING}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              data={featuredProperties}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.featuredList}
              onMomentumScrollEnd={handleFeaturedScroll}
              onTouchStart={handleFeaturedTouchStart}
              onTouchEnd={handleFeaturedTouchEnd}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.featuredSlide}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/property/${item.id}`);
                  }}
                  testID={`featured-slide-${item.id}`}
                >
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.featuredSlideImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.featuredSlideOverlay} />
                  <View style={styles.featuredSlideContent}>
                    <View style={styles.featuredSlideBadgeRow}>
                      <View style={styles.featuredStarBadge}>
                        <Star size={10} color={Colors.accent} fill={Colors.accent} />
                        <Text style={styles.featuredStarText}>Featured</Text>
                      </View>
                      <View style={styles.featuredTypeBadge}>
                        <Text style={styles.featuredTypeText}>
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.featuredSlideBottom}>
                      <Text style={styles.featuredSlideTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.featuredSlideLocation}>
                        <MapPin size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.featuredSlideCity} numberOfLines={1}>{item.city}</Text>
                      </View>
                      <View style={styles.featuredSlidePriceRow}>
                        <Text style={styles.featuredSlidePrice}>
                          {formatFeaturedPrice(item.price, item.currency, item.period)}
                        </Text>
                        <View style={styles.featuredSlideRating}>
                          <Star size={12} color={Colors.accent} fill={Colors.accent} />
                          <Text style={styles.featuredSlideRatingText}>{item.rating}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Properties' : categories.find(c => c.key === selectedCategory)?.label ?? 'Properties'}
            </Text>
            <Text style={styles.countText}>{filteredProperties.length} results</Text>
          </View>

          {filteredProperties.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No properties found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white, zIndex: 10 },
  header: {
    paddingHorizontal: 20, paddingBottom: 16, backgroundColor: Colors.white,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 8 },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' as const },
  greetingBold: { fontSize: 24, fontWeight: '800' as const, color: Colors.text, letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primaryLight },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  filterButton: { backgroundColor: Colors.primary, width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  addPropertyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16,
  },
  addPropertyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addPropertyTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.white },
  addPropertySubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  categoriesSection: { paddingTop: 16, marginBottom: 4 },
  categoriesRow: { paddingHorizontal: 20, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, gap: 8 },
  categoryChipInactive: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  categoryIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 13, fontWeight: '600' as const },
  categoryTextActive: { color: Colors.white },
  section: { paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },

  countText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' as const },
  featuredList: { paddingHorizontal: 20, gap: SLIDE_SPACING },
  featuredSlide: { width: SLIDE_WIDTH, height: 200, borderRadius: 18, overflow: 'hidden', position: 'relative' as const },
  featuredSlideImage: { width: '100%', height: '100%' },
  featuredSlideOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 18 },
  featuredSlideContent: { ...StyleSheet.absoluteFillObject, padding: 16, justifyContent: 'space-between' },
  featuredSlideBadgeRow: { flexDirection: 'row', gap: 8 },
  featuredStarBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  featuredStarText: { fontSize: 11, fontWeight: '700' as const, color: Colors.accent },
  featuredTypeBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  featuredTypeText: { fontSize: 11, fontWeight: '600' as const, color: Colors.white },
  featuredSlideBottom: { gap: 4 },
  featuredSlideTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.white, letterSpacing: -0.3 },
  featuredSlideLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredSlideCity: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' as const },
  featuredSlidePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  featuredSlidePrice: { fontSize: 20, fontWeight: '800' as const, color: Colors.white },
  featuredSlideRating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  featuredSlideRatingText: { fontSize: 13, fontWeight: '700' as const, color: Colors.white },
  slideDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slideDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  slideDotActive: { backgroundColor: Colors.primary, width: 20 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  bottomSpacer: { height: 30 },
});
