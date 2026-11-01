import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Check, X as XIcon, Clock, MapPin, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Booking, BookingStatus } from '@/types/property';

const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;

export default function BookingsScreen() {
  const { user } = useAuth();
  const { bookings, updateBooking } = useData();
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  const handleStatusChange = useCallback(async (id: string, status: BookingStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateBooking({ id, status });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('[Bookings] Update error:', e);
    }
  }, [updateBooking]);

  const statusColors: Record<string, string> = {
    pending: Colors.warning,
    confirmed: Colors.success,
    completed: Colors.primary,
    cancelled: Colors.error,
  };

  const renderBooking = useCallback(({ item }: { item: Booking }) => {
    const isOwner = user?.role === 'landlord' && item.ownerId === user?.id;
    const isAdmin = user?.role === 'admin';

    return (
      <View style={styles.card}>
        <Pressable style={styles.cardTop} onPress={() => router.push(`/property/${item.propertyId}`)}>
          <SafeImage uri={item.propertyImage} style={styles.cardImage} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.propertyTitle}</Text>
            <View style={styles.cardRow}>
              <Calendar size={12} color={Colors.textSecondary} />
              <Text style={styles.cardDetail}>{item.date} at {item.time}</Text>
              {item.type === 'video' && (
                <View style={styles.videoBadge}>
                  <Video size={10} color={Colors.white} />
                  <Text style={styles.videoBadgeText}>Video tour</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardPerson}>
              {isOwner || isAdmin ? `Renter: ${item.renterName}` : `Owner: ${item.ownerName}`}
            </Text>
            {item.notes ? <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text> : null}
          </View>
        </Pressable>
        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: (statusColors[item.status] ?? Colors.textLight) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] ?? Colors.textLight }]} />
            <Text style={[styles.statusLabel, { color: statusColors[item.status] ?? Colors.textLight }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          {(isOwner || isAdmin) && item.status === 'pending' && (
            <View style={styles.actionRow}>
              <Pressable style={styles.confirmBtn} onPress={() => handleStatusChange(item.id, 'confirmed')} testID={`confirm-${item.id}`}>
                <Check size={16} color={Colors.white} />
                <Text style={styles.confirmText}>Confirm</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => handleStatusChange(item.id, 'cancelled')} testID={`cancel-${item.id}`}>
                <XIcon size={16} color={Colors.error} />
              </Pressable>
            </View>
          )}
          {!isOwner && !isAdmin && item.status === 'pending' && (
            <Pressable style={styles.cancelBtn} onPress={() => handleStatusChange(item.id, 'cancelled')}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [user, handleStatusChange]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back"><ArrowLeft size={22} color={Colors.text} /></Pressable>
          <Text style={styles.headerTitle}>Bookings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Calendar size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No bookings</Text>
            <Text style={styles.emptySubtitle}>Your viewing requests will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' as const, color: Colors.text },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.white, gap: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  listContent: { padding: 20, gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', padding: 14, gap: 12 },
  cardImage: { width: 70, height: 70, borderRadius: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  videoBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  videoBadgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' as const },
  cardDetail: { fontSize: 13, color: Colors.textSecondary },
  cardPerson: { fontSize: 12, color: Colors.primary, fontWeight: '500' as const, marginTop: 4 },
  cardNotes: { fontSize: 12, color: Colors.textLight, marginTop: 2, fontStyle: 'italic' as const },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 12, fontWeight: '600' as const },
  actionRow: { flexDirection: 'row', gap: 8 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.success },
  confirmText: { fontSize: 13, fontWeight: '600' as const, color: Colors.white },
  rejectBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.error + '12' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.error + '12' },
  cancelText: { fontSize: 13, fontWeight: '600' as const, color: Colors.error },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
