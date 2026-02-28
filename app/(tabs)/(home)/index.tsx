import React, { useState, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Search, SlidersHorizontal, MapPin, Building2, Home, Hotel, DoorOpen, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { properties } from '@/mocks/properties';
import { PropertyType } from '@/types/property';
import PropertyCard from '@/components/PropertyCard';

const categories: { key: PropertyType | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: 'All', icon: <Home size={20} color={Colors.white} />, color: Colors.primary },
  { key: 'apartment', label: 'Apartments', icon: <Building2 size={20} color={Colors.white} />, color: Colors.categoryApartment },
  { key: 'office', label: 'Offices', icon: <Building2 size={20} color={Colors.white} />, color: Colors.categoryOffice },
  { key: 'hostel', label: 'Hostels', icon: <Hotel size={20} color={Colors.white} />, color: Colors.categoryHostel },
  { key: 'room', label: 'Rooms', icon: <DoorOpen size={20} color={Colors.white} />, color: Colors.categoryRoom },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PropertyType | 'all'>('all');
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleCategoryPress = useCallback((key: PropertyType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(key);
  }, []);

  const handleFilterPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/filters');
  }, []);

  const handleSearchSubmit = useCallback(() => {
    console.log('Search submitted:', searchQuery);
  }, [searchQuery]);

  const filteredProperties = useMemo(() => {
    let result = properties;
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
  }, [selectedCategory, searchQuery]);

  const featuredProperties = useMemo(() => properties.filter(p => p.featured), []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Find your</Text>
              <Text style={styles.greetingBold}>Perfect Space</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/profile')} testID="header-avatar">
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face' }}
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
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                testID="search-input"
              />
            </View>
            <Pressable style={styles.filterButton} onPress={handleFilterPress} testID="filter-button">
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
              <Pressable
                style={styles.seeAllButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ChevronRight size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredProperties}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.featuredList}
              renderItem={({ item }) => <PropertyCard property={item} compact />}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  greetingBold: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  filterButton: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  categoriesSection: {
    paddingTop: 16,
    marginBottom: 4,
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  categoryChipInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  categoryTextActive: {
    color: Colors.white,
  },
  section: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  countText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  featuredList: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});
