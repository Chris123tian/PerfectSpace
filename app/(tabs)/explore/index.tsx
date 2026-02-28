import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Map, List, MapPin, SlidersHorizontal } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { properties } from '@/mocks/properties';
import PropertyCard from '@/components/PropertyCard';

export default function ExploreScreen() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter(
      p => p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleView = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode(prev => prev === 'list' ? 'map' : 'list');
  }, []);

  const handlePropertyPress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/property/${id}`);
  }, []);

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <MapPin size={48} color={Colors.primary} />
        <Text style={styles.mapTitle}>Map View</Text>
        <Text style={styles.mapSubtitle}>
          {filteredProperties.length} properties in your area
        </Text>
        <View style={styles.mapPins}>
          {filteredProperties.map((p) => (
            <Pressable
              key={p.id}
              style={styles.mapPinCard}
              onPress={() => handlePropertyPress(p.id)}
              testID={`map-pin-${p.id}`}
            >
              <MapPin size={14} color={Colors.primary} />
              <Text style={styles.mapPinText} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.mapPinPrice}>{p.currency}{p.price.toLocaleString()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search properties..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                testID="explore-search"
              />
            </View>
            <Pressable
              style={[styles.viewToggle, viewMode === 'map' && styles.viewToggleActive]}
              onPress={toggleView}
              testID="view-toggle"
            >
              {viewMode === 'list' ? (
                <Map size={20} color={viewMode === 'list' ? Colors.textSecondary : Colors.white} />
              ) : (
                <List size={20} color={Colors.white} />
              )}
            </Pressable>
            <Pressable
              style={styles.filterBtn}
              onPress={() => router.push('/filters')}
              testID="explore-filter"
            >
              <SlidersHorizontal size={20} color={Colors.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {viewMode === 'map' ? (
        renderMapView()
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{filteredProperties.length} properties found</Text>
          }
          renderItem={({ item }) => <PropertyCard property={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySubtitle}>Try a different search term</Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 14,
    paddingTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  viewToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 30,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  mapSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  mapPins: {
    width: '100%',
    gap: 8,
  },
  mapPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mapPinText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  mapPinPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
});
