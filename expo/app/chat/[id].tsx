import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SafeImage from '@/components/SafeImage';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Send, Home as HomeIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { ChatMessage } from '@/types/property';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { conversations, getConversationMessages, sendMessage, markConversationRead } = useData();
  const [text, setText] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  const conversation = useMemo(() => conversations.find(c => c.id === id), [conversations, id]);
  const messages = useMemo(() => getConversationMessages(id ?? ''), [getConversationMessages, id]);
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [messages]);

  useEffect(() => {
    if (id) markConversationRead(id);
  }, [id, markConversationRead, messages.length]);

  const otherParticipant = useMemo(() => {
    if (!conversation || !user) return { name: 'Unknown', avatar: '' };
    const idx = conversation.participantIds.indexOf(user.id);
    const otherIdx = idx === 0 ? 1 : 0;
    return {
      name: conversation.participantNames[otherIdx] ?? 'Unknown',
      avatar: conversation.participantAvatars[otherIdx] ?? '',
    };
  }, [conversation, user]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = text.trim();
    setText('');
    try {
      await sendMessage({ conversationId: id, text: msg });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log('[Chat] Send error:', e);
    }
  }, [text, id, sendMessage]);

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.messageBubbleRow, isMe ? styles.myRow : styles.otherRow]}>
        {!isMe && <SafeImage uri={otherParticipant.avatar} style={styles.messageAvatar} variant="avatar" role="default" />}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>{item.text}</Text>
          <Text style={[styles.messageTime, isMe ? styles.myTime : styles.otherTime]}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
    );
  }, [user, otherParticipant, formatTime]);

  if (!conversation) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.chatHeader}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}><ArrowLeft size={22} color={Colors.text} /></Pressable>
            <Text style={styles.headerName}>Conversation not found</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.chatHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} testID="chat-back">
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <SafeImage uri={otherParticipant.avatar} style={styles.headerAvatar} variant="avatar" role="default" />
            <View>
              <Text style={styles.headerName}>{otherParticipant.name}</Text>
              <Text style={styles.headerProperty} numberOfLines={1}>{conversation.propertyTitle}</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push(`/property/${conversation.propertyId}`)} style={styles.propertyBtn} testID="view-property">
            <HomeIcon size={18} color={Colors.primary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatBody} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Start the conversation!</Text>
            </View>
          }
        />

        <SafeAreaView edges={['bottom']} style={styles.inputBar}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textLight}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
              testID="chat-input"
            />
            <Pressable
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim()}
              testID="chat-send"
            >
              <Send size={20} color={text.trim() ? Colors.white : Colors.textLight} />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { backgroundColor: Colors.white },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerName: { fontSize: 16, fontWeight: '700' as const, color: Colors.text },
  headerProperty: { fontSize: 12, color: Colors.primary, fontWeight: '500' as const, maxWidth: 180 },
  propertyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  chatBody: { flex: 1 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageBubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  myRow: { justifyContent: 'flex-end' },
  otherRow: { justifyContent: 'flex-start' },
  messageAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 21 },
  myText: { color: Colors.white },
  otherText: { color: Colors.text },
  messageTime: { fontSize: 10, marginTop: 4 },
  myTime: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' as const },
  otherTime: { color: Colors.textLight },
  emptyChat: { alignItems: 'center', paddingVertical: 60 },
  emptyChatText: { fontSize: 15, color: Colors.textLight },
  inputBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  textInput: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, color: Colors.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
