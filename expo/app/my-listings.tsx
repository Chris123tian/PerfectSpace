import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { ArrowLeft, Plus, Edit3, Trash2, Eye, Star, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Property } from '@/types/property';

export default function MyListingsScreen() {
  const { myProperties, deleteProperty, updateProperty } = useData();

  const handleDelete = useCallback((property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Listing', `Are you sure you want to delete "${property.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteProperty(property.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            console.log('[MyListings] Delete error:', e);
          }
        },
      },
    ]);
  }, [deleteProperty]);

  const toggleFeatured = useCallback(async (property: Property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await updateProperty({ id: property.id, updates: { featured: !property.featured } });
    } catch (e) {
      console.log('[MyListings] Toggle error:', e);
    }
  }, [updateProperty]);

  const renderProperty = useCallback(({ item }: { item: Property }) => (
    <View style={styles.card}>
      <Pressable onPress={() => router.push(`/property/${item.id}`)} testID={`listing-${item.id}`}>
        <SafeImage uri={item.images[0]} style={styles.image} propertyType={item.type} variant="property" contentFit="cover" />
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? Colors.success : item.status === 'rejected' ? Colors.error : Colors.warning }]}>
          <Text style={styles.statusText}>
            {item.status === 'pending' ? 'Pending Approval' : item.status === 'rejected' ? 'Rejected' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        {item.featured && (
          <View style={styles.featuredBadge}>
            <Star size={10} color={Colors.accent} fill={Colors.accent} />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        )}
      </Pressable>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardLocation}>
          <MapPin size={12} color={Colors.textSecondary} />
          <Text style={styles.cardLocationText}>{item.city}</Text>
        </View>
        <Text style={styles.cardPrice}>{item.currency}{item.price.toLocaleString()}{item.period ?? ''}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.cardStat}>{item.rating > 0 ? `★ ${item.rating}` : 'No ratings'}</Text>
          <Text style={styles.cardStat}>{item.reviewCount} reviews</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => router.push(`/property/${item.id}`)}>
          <Eye size={16} color={Colors.primary} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => toggleFeatured(item)}>
          <Star size={16} color={item.featured ? Colors.accent : Colors.textLight} fill={item.featured ? Colors.accent : 'transparent'} />
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
          <Trash2 size={16} color={Colors.error} />
        </Pressable>
      </View>
    </View>
  ), [handleDelete, toggleFeatured]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back"><ArrowLeft size={22} color={Colors.text} /></Pressable>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Pressable onPress={() => router.push('/add-property')} style={styles.addBtn} testID="add-listing">
            <Plus size={22} color={Colors.white} />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={myProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first property</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 20, gap: 16 },
  card: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  image: { width: '100%', height: 160 },
  statusBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: Colors.white, fontSize: 11, fontWeight: '700' as const },
  featuredBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  featuredText: { fontSize: 10, fontWeight: '700' as const, color: Colors.accent },
  cardInfo: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardLocationText: { fontSize: 13, color: Colors.textSecondary },
  cardPrice: { fontSize: 18, fontWeight: '800' as const, color: Colors.primary, marginTop: 6 },
  cardStats: { flexDirection: 'row', gap: 16, marginTop: 6 },
  cardStat: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.borderLight, padding: 10, gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center' },
  deleteBtn: { backgroundColor: Colors.error + '10' },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
