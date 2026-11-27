import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBack } from '@/lib/nav';
import { ArrowLeft, Bell, Calendar, MessageCircle, Star, Shield, CheckCheck, X, Trash2, BadgeCheck } from 'lucide-react-native';
import { showAlert } from '@/lib/alert';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { AppNotification } from '@/types/property';

const typeIcons: Record<string, React.ReactNode> = {
  booking: <Calendar size={20} color={Colors.accent} />,
  message: <MessageCircle size={20} color={Colors.primary} />,
  review: <Star size={20} color={Colors.warning} />,
  system: <Shield size={20} color={Colors.categoryOffice} />,
  property: <Bell size={20} color={Colors.success} />,
  verification: <BadgeCheck size={20} color={Colors.primary} />,
};

export default function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, clearNotifications } = useData();

  const handleDelete = useCallback(async (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await deleteNotification(id);
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Could not delete notification.');
    }
  }, [deleteNotification]);

  const handleClearAll = useCallback(() => {
    showAlert('Clear all notifications?', 'This permanently deletes every notification in this list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all', style: 'destructive',
        onPress: async () => {
          try {
            await clearNotifications();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {
            showAlert('Error', e instanceof Error ? e.message : 'Could not clear notifications.');
          }
        },
      },
    ]);
  }, [clearNotifications]);

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  }, []);

  const handlePress = useCallback((notif: AppNotification) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notif.read) void markNotificationRead(notif.id);

    if (notif.type === 'booking' && notif.data?.bookingId) {
      router.push('/bookings');
    } else if (notif.type === 'message' && notif.data?.conversationId) {
      router.push(`/chat/${notif.data.conversationId}`);
    } else if (notif.type === 'verification' && notif.userId === 'admins') {
      router.push('/admin');
    } else if (notif.data?.propertyId) {
      router.push(`/property/${notif.data.propertyId}`);
    }
  }, [markNotificationRead]);

  const renderNotification = useCallback(({ item }: { item: AppNotification }) => (
    <Pressable
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => handlePress(item)}
      testID={`notif-${item.id}`}
    >
      <View style={[styles.iconContainer, !item.read && styles.iconUnread]}>
        {typeIcons[item.type] ?? <Bell size={20} color={Colors.textSecondary} />}
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>{item.title}</Text>
        <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
      </View>
      <View style={styles.cardSide}>
        {!item.read && <View style={styles.unreadDot} />}
        <Pressable onPress={() => void handleDelete(item.id)} hitSlop={10} style={styles.deleteBtn} testID={`delete-notif-${item.id}`}>
          <X size={16} color={Colors.textLight} />
        </Pressable>
      </View>
    </Pressable>
  ), [handlePress, formatTime, handleDelete]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => goBack()} style={styles.backBtn} testID="back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void markAllNotificationsRead(); }} style={styles.markAllBtn} testID="mark-all-read">
                <CheckCheck size={20} color={Colors.primary} />
              </Pressable>
            )}
            {notifications.length > 0 ? (
              <Pressable onPress={handleClearAll} style={[styles.markAllBtn, styles.clearBtn]} testID="clear-notifications">
                <Trash2 size={18} color={Colors.error} />
              </Pressable>
            ) : unreadCount === 0 ? <View style={{ width: 40 }} /> : null}
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
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
  headerActions: { flexDirection: 'row', gap: 8 },
  clearBtn: { backgroundColor: Colors.error + '15' },
  cardSide: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', gap: 8 },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 30 },
  card: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, gap: 12, alignItems: 'flex-start' },
  cardUnread: { backgroundColor: Colors.primaryLight + '40' },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: Colors.primaryLight },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  cardTitleUnread: { fontWeight: '700' as const },
  cardMessage: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  cardTime: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  separator: { height: 1, backgroundColor: Colors.borderLight },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
