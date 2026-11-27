import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { showAlert } from '@/lib/alert';

type Audience = 'all' | 'landlords' | 'renters';
const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'landlords', label: 'Landlords' },
  { id: 'renters', label: 'Renters' },
];

/** Sends an in-app notification (and optionally an SMS) to every active member of an audience. */
export default function BroadcastPanel({ contentStyle }: { contentStyle: object }) {
  const [audience, setAudience] = useState<Audience>('all');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sms, setSms] = useState<boolean>(false);
  const config = trpc.payments.config.useQuery();
  const broadcast = trpc.notifications.broadcast.useMutation();
  const smsReady = config.data?.smsEnabled ?? false;
  const valid = title.trim().length >= 2 && message.trim().length >= 2;

  const send = useCallback(() => {
    const who = AUDIENCES.find(a => a.id === audience)?.label.toLowerCase() ?? audience;
    showAlert('Send broadcast', `Notify ${who}${sms ? ' by in-app notification and SMS' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            const res = await broadcast.mutateAsync({ audience, title: title.trim(), message: message.trim(), sms });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTitle('');
            setMessage('');
            showAlert('Sent', `Delivered to ${res.sent} member${res.sent === 1 ? '' : 's'}.`);
          } catch (e) {
            showAlert('Broadcast failed', e instanceof Error ? e.message : 'Could not send.');
          }
        },
      },
    ]);
  }, [audience, title, message, sms, broadcast]);

  return (
    <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headIcon}><Megaphone size={18} color={Colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Broadcast</Text>
            <Text style={styles.sub}>Announcements, maintenance notices, policy updates</Text>
          </View>
        </View>
        <Text style={styles.label}>Audience</Text>
        <View style={styles.segment}>
          {AUDIENCES.map(a => (
            <Pressable key={a.id} style={[styles.segBtn, audience === a.id && styles.segBtnActive]} onPress={() => setAudience(a.id)} testID={`broadcast-audience-${a.id}`}>
              <Text style={[styles.segText, audience === a.id && styles.segTextActive]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={80} placeholder="e.g. New: pay rent online" placeholderTextColor={Colors.textLight} testID="broadcast-title" />
        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
          value={message}
          onChangeText={setMessage}
          maxLength={400}
          multiline
          placeholder="What should members know?"
          placeholderTextColor={Colors.textLight}
          testID="broadcast-message"
        />
        <Text style={styles.counter}>{message.length}/400</Text>
        <View style={styles.smsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smsLabel}>Also send by SMS</Text>
            <Text style={styles.sub}>{smsReady ? 'Only to members with a phone number and SMS alerts on' : 'SMS turns on once mNotify is connected'}</Text>
          </View>
          <Switch value={sms && smsReady} onValueChange={setSms} disabled={!smsReady} trackColor={{ false: Colors.border, true: Colors.primaryLight }} thumbColor={sms && smsReady ? Colors.primary : Colors.textLight} testID="broadcast-sms" />
        </View>
        <Pressable style={[styles.sendBtn, (!valid || broadcast.isPending) && { opacity: 0.45 }]} disabled={!valid || broadcast.isPending} onPress={send} testID="broadcast-send">
          {broadcast.isPending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.sendText}>Send broadcast</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 18, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  headIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800' as const, color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  label: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary, marginTop: 6, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  segment: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: 12, padding: 4, gap: 4 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
  segTextActive: { color: Colors.white },
  input: { backgroundColor: Colors.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: Colors.text },
  counter: { fontSize: 11, color: Colors.textLight, alignSelf: 'flex-end' },
  smsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  smsLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  sendBtn: { marginTop: 6, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  sendText: { color: Colors.white, fontSize: 15, fontWeight: '700' as const },
});
