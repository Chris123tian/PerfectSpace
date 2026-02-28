import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MessageCircle, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { messages } from '@/mocks/properties';
import { Message } from '@/types/property';

export default function MessagesScreen() {
  const handleMessagePress = useCallback((message: Message) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      message.senderName,
      `Property: ${message.propertyTitle}\n\n"${message.lastMessage}"`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Reply', onPress: () => console.log('Reply to:', message.id) },
      ]
    );
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <Pressable
      style={styles.messageCard}
      onPress={() => handleMessagePress(item)}
      testID={`message-${item.id}`}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.senderAvatar }} style={styles.avatar} />
        {item.unread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.senderName, item.unread && styles.unreadText]}>
            {item.senderName}
          </Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.propertyTitle} numberOfLines={1}>{item.propertyTitle}</Text>
        <Text
          style={[styles.lastMessage, item.unread && styles.unreadMessage]}
          numberOfLines={2}
        >
          {item.lastMessage}
        </Text>
      </View>
    </Pressable>
  ), [handleMessagePress]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Pressable
            style={styles.searchButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Search', 'Search through your messages');
            }}
            testID="message-search"
          >
            <Search size={22} color={Colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MessageCircle size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation by contacting a property owner
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 30,
  },
  messageCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  unreadText: {
    fontWeight: '700' as const,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textLight,
  },
  propertyTitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  unreadMessage: {
    color: Colors.text,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 88,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
