import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ExternalLink, MessageCircle, Send } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SafeImage from '@/components/SafeImage';
import { trpc } from '@/lib/trpc';
import { showAlert } from '@/lib/alert';
import type { Conversation } from '@/types/property';

interface Props {
  conversations: Conversation[];
  staffId: string;
  isWide: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

function fmt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function memberUnread(c: Conversation): number {
  return Object.entries(c.unreadCount)
    .filter(([id]) => id !== c.participantIds[0])
    .reduce((s, [, n]) => s + n, 0);
}

/** Support inbox with an inline thread: staff read and reply without leaving the console. */
export default function SupportInbox({ conversations, staffId, isWide, refreshing, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const scrollRef = useRef<ScrollView>(null);
  const utils = trpc.useUtils();

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => (b.lastMessageTime ?? '').localeCompare(a.lastMessageTime ?? '')),
    [conversations]
  );
  const selected = sorted.find(c => c.id === selectedId) ?? null;

  useEffect(() => {
    if (isWide && !selectedId && sorted.length > 0) setSelectedId(sorted[0].id);
  }, [isWide, selectedId, sorted]);

  const messagesQuery = trpc.conversations.getMessages.useQuery(
    { conversationId: selectedId ?? '' },
    { enabled: !!selectedId, refetchInterval: selectedId ? 5000 : false }
  );
  const markRead = trpc.conversations.markRead.useMutation({
    onSuccess: () => { void utils.conversations.list.invalidate(); },
  });
  const send = trpc.conversations.sendMessage.useMutation();

  const markReadRef = useRef(markRead.mutate);
  markReadRef.current = markRead.mutate;
  useEffect(() => {
    if (selectedId) markReadRef.current({ conversationId: selectedId });
  }, [selectedId]);

  const messages = useMemo(
    () => [...(messagesQuery.data ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [messagesQuery.data]
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await send.mutateAsync({ conversationId: selectedId, text });
      setDraft('');
      await Promise.all([messagesQuery.refetch(), utils.conversations.list.invalidate()]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      showAlert('Reply failed', e instanceof Error ? e.message : 'Could not send the reply.');
    }
  }, [draft, selectedId, send, messagesQuery, utils]);

  const list = (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <MessageCircle size={44} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No support chats</Text>
          <Text style={styles.emptySub}>Messages members send to Support land here</Text>
        </View>
      }
      renderItem={({ item: c }) => {
        const unread = memberUnread(c);
        const active = c.id === selectedId;
        return (
          <Pressable
            style={[styles.convRow, active && styles.convRowActive]}
            onPress={() => setSelectedId(c.id)}
            testID={`support-${c.id}`}
          >
            <SafeImage uri={c.participantAvatars[0]} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.convTop}>
                <Text style={styles.convName} numberOfLines={1}>{c.participantNames[0] ?? 'Member'}</Text>
                <Text style={styles.convTime}>{fmt(c.lastMessageTime)}</Text>
              </View>
              <Text style={[styles.convLast, unread > 0 && styles.convLastUnread]} numberOfLines={2}>{c.lastMessage}</Text>
            </View>
            {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
          </Pressable>
        );
      }}
    />
  );

  const thread = selected ? (
    <View style={styles.thread}>
      <View style={styles.threadHeader}>
        {!isWide && (
          <Pressable style={styles.iconBtn} onPress={() => setSelectedId(null)} testID="support-thread-back">
            <ArrowLeft size={18} color={Colors.text} />
          </Pressable>
        )}
        <SafeImage uri={selected.participantAvatars[0]} style={styles.avatarSm} />
        <View style={{ flex: 1 }}>
          <Text style={styles.convName} numberOfLines={1}>{selected.participantNames[0] ?? 'Member'}</Text>
          <Text style={styles.convTime}>Support conversation</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/chat/${selected.id}`)} testID="support-open-chat">
          <ExternalLink size={16} color={Colors.textSecondary} />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messagesQuery.isLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />}
        {messages.map(m => {
          const fromMember = m.senderId === selected.participantIds[0];
          return (
            <View key={m.id} style={[styles.bubbleWrap, fromMember ? styles.left : styles.right]}>
              <View style={[styles.bubble, fromMember ? styles.bubbleMember : styles.bubbleStaff]}>
                <Text style={[styles.bubbleText, !fromMember && { color: Colors.white }]}>{m.text}</Text>
              </View>
              <Text style={styles.bubbleTime}>{fromMember ? '' : m.senderId === staffId ? 'You · ' : 'Staff · '}{fmt(m.timestamp)}</Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a reply…"
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={2000}
          testID="support-reply-input"
        />
        <Pressable
          style={[styles.sendBtn, (!draft.trim() || send.isPending) && { opacity: 0.4 }]}
          onPress={() => void handleSend()}
          disabled={!draft.trim() || send.isPending}
          testID="support-reply-send"
        >
          {send.isPending ? <ActivityIndicator color={Colors.white} size="small" /> : <Send size={18} color={Colors.white} />}
        </Pressable>
      </View>
    </View>
  ) : (
    <View style={[styles.thread, styles.threadEmpty]}>
      <MessageCircle size={36} color={Colors.textLight} />
      <Text style={styles.emptySub}>Pick a conversation to reply</Text>
    </View>
  );

  if (isWide) {
    return (
      <View style={styles.split}>
        <View style={styles.splitList}>{list}</View>
        <View style={{ flex: 1 }}>{thread}</View>
      </View>
    );
  }
  return selected ? thread : list;
}

const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: 'row', gap: 12, padding: 16 },
  splitList: { width: 320, backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden' },
  listContent: { padding: 12, paddingBottom: 40 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: Colors.white, marginBottom: 6 },
  convRowActive: { backgroundColor: Colors.primaryLight },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  convName: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, flexShrink: 1 },
  convTime: { fontSize: 11, color: Colors.textLight },
  convLast: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  convLastUnread: { color: Colors.text, fontWeight: '600' as const },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarSm: { width: 34, height: 34, borderRadius: 17 },
  badge: { backgroundColor: Colors.error, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' as const },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const },
  thread: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden' },
  threadEmpty: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  messages: { padding: 14, gap: 10 },
  bubbleWrap: { maxWidth: '82%', gap: 3 },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  bubbleMember: { backgroundColor: Colors.background, borderBottomLeftRadius: 4 },
  bubbleStaff: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 19 },
  bubbleTime: { fontSize: 10, color: Colors.textLight },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 12, backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
