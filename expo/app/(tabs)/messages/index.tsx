import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { MessageCircle, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Conversation } from '@/types/property';

export default function MessagesScreen() {
  const { user } = useAuth();
  const { conversations } = useData();

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [conversations]);

  const getOtherParticipant = useCallback((conv: Conversation) => {
    if (!user) return { name: '', avatar: '' };
    const idx = conv.participantIds.indexOf(user.id);
    const otherIdx = idx === 0 ? 1 : 0;
    return {
      name: conv.participantNames[otherIdx] ?? 'Unknown',
      avatar: conv.participantAvatars[otherIdx] ?? '',
    };
  }, [user]);

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

  const handlePress = useCallback((conv: Conversation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/chat/${conv.id}`);
  }, []);

  const renderConversation = useCallback(({ item }: { item: Conversation }) => {
    const other = getOtherParticipant(item);
    const unread = user ? (item.unreadCount[user.id] ?? 0) : 0;

    return (
      <Pressable style={styles.messageCard} onPress={() => handlePress(item)} testID={`conversation-${item.id}`}>
        <View style={styles.avatarContainer}>
          <SafeImage uri={other.avatar} style={styles.avatar} variant="avatar" role="default" />
          {unread > 0 && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <Text style={[styles.senderName, unread > 0 && styles.unreadText]}>{other.name}</Text>
            <Text style={styles.timestamp}>{formatTime(item.lastMessageTime)}</Text>
          </View>
          <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>
          <Text style={[styles.lastMessage, unread > 0 && styles.unreadMessage]} numberOfLines={2}>{item.lastMessage}</Text>
        </View>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unread}</Text>
          </View>
        )}
      </Pressable>
    );
  }, [getOtherParticipant, handlePress, formatTime, user]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
      </SafeAreaView>

      <FlatList
        data={sortedConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageCircle size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Start a conversation by contacting a property owner</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8, backgroundColor: Colors.white },
  headerTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.text },
  listContent: { paddingTop: 8, paddingBottom: 30 },
  messageCard: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.white, gap: 14, alignItems: 'center' },
  avatarContainer: { position: 'relative' as const },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  unreadDot: { position: 'absolute' as const, top: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.white },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  senderName: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
  unreadText: { fontWeight: '700' as const },
  timestamp: { fontSize: 12, color: Colors.textLight },
  propertyTitle: { fontSize: 12, color: Colors.primary, fontWeight: '500' as const, marginBottom: 4 },
  lastMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  unreadMessage: { color: Colors.text },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' as const },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 88 },
  emptyState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600' as const, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
