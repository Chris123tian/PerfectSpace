import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, Star, MessageSquare } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Review } from '@/types/property';

export default function MyReviewsScreen() {
  const { user } = useAuth();
  const { reviews, properties } = useData();

  const myReviews = useMemo(() => {
    if (!user) return [];
    return reviews.filter(r => r.userId === user.id);
  }, [reviews, user]);

  const getPropertyTitle = (propertyId: string): string => {
    const prop = properties.find(p => p.id === propertyId);
    return prop?.title ?? 'Unknown Property';
  };

  const getPropertyImage = (propertyId: string): string => {
    const prop = properties.find(p => p.id === propertyId);
    return prop?.images[0] ?? 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
  };

  const renderReview = ({ item }: { item: Review }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/property/${item.propertyId}`)}
      testID={`review-${item.id}`}
    >
      <Image source={{ uri: getPropertyImage(item.propertyId) }} style={styles.cardImage} contentFit="cover" />
      <View style={styles.cardContent}>
        <Text style={styles.propertyTitle} numberOfLines={1}>{getPropertyTitle(item.propertyId)}</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={14} color={Colors.accent} fill={n <= item.rating ? Colors.accent : 'transparent'} />
          ))}
          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>
        <Text style={styles.comment} numberOfLines={2}>{item.comment}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>My Reviews</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <FlatList
        data={myReviews}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageSquare size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>Visit properties and leave reviews to help other renters</Text>
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
  listContent: { padding: 20, gap: 12 },
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12, padding: 12 },
  cardImage: { width: 70, height: 70, borderRadius: 12 },
  cardContent: { flex: 1 },
  propertyTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  ratingText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, marginLeft: 6 },
  comment: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  date: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
