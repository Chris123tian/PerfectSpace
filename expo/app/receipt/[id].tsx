import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Printer, Share2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { goBack } from '@/lib/nav';
import { formatMoney } from '@/lib/checkout';

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const mask = (s: string) => (s.length > 4 ? `•••• ${s.slice(-4)}` : s);

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = trpc.payments.receipt.useQuery({ id: String(id ?? '') }, { enabled: !!id });

  const rows: [string, string][] = [];
  let title = 'Receipt';
  let number = '';
  let total = '';
  if (q.data?.kind === 'payment') {
    const p = q.data.payment;
    title = 'Payment receipt';
    number = p.receiptNumber ?? p.reference;
    total = formatMoney(p.amount, p.currency);
    rows.push(
      ['Property', p.propertyTitle],
      ['Paid by', p.renterName],
      ['Landlord', p.ownerName],
      ['Period', p.unit === 'purchase' ? 'Purchase' : `${p.quantity} ${p.unit}${p.quantity > 1 ? 's' : ''}`],
      ['Method', (p.channel ?? 'paystack').replace(/_/g, ' ')],
      ['Reference', p.reference],
      ['Date paid', fmtDate(p.paidAt)],
      ['Funds', p.payoutStatus === 'paid' ? 'Released to landlord' : 'Held until move-in'],
    );
  } else if (q.data?.kind === 'payout') {
    const o = q.data.payout;
    title = 'Payout receipt';
    number = o.receiptNumber;
    total = formatMoney(o.amount, o.currency);
    rows.push(
      ['Property', o.propertyTitle],
      ['Paid to', `${o.destination.accountName}`],
      ['Account', `${o.destination.bankName} ${mask(o.destination.accountNumber)}`],
      ['Released by', o.releasedBy === 'code' ? 'Renter release code' : 'Perfect Space admin'],
      ['Status', o.status],
      ['Reference', o.reference],
      ['Date', fmtDate(o.completedAt ?? o.createdAt)],
    );
  }

  const share = async () => {
    const text = [`Perfect Space — ${title}`, `No. ${number}`, `Amount: ${total}`, ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }
    await Share.share({ message: text, title });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} hitSlop={10} testID="receipt-back">
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Receipt</Text>
        <Pressable onPress={share} hitSlop={10} disabled={!q.data} testID="receipt-share">
          {Platform.OS === 'web' ? <Printer size={20} color={Colors.primary} /> : <Share2 size={20} color={Colors.primary} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {q.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : q.error ? (
          <Text style={styles.error}>{q.error.message}</Text>
        ) : (
          <View style={styles.paper} testID="receipt-paper">
            <Text style={styles.brand}>Perfect Space</Text>
            <Text style={styles.kind}>{title}</Text>
            <Text style={styles.number}>No. {number}</Text>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Amount</Text>
              <Text style={styles.total} testID="receipt-total">{total}</Text>
            </View>
            {rows.map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.k}>{k}</Text>
                <Text style={styles.v} selectable>{v}</Text>
              </View>
            ))}
            <View style={styles.tear} />
            <Text style={styles.foot}>Processed securely by Paystack. Keep this receipt for your records.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  scroll: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  paper: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, gap: 4 },
  brand: { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  kind: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  number: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  totalBox: { backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 16, marginBottom: 12 },
  totalLabel: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
  total: { fontSize: 28, fontWeight: '900', color: Colors.primaryDark },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 16 },
  k: { fontSize: 13, color: Colors.textSecondary },
  v: { fontSize: 13, color: Colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right', textTransform: 'none' },
  tear: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: Colors.border, marginVertical: 14 },
  foot: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  error: { color: Colors.error, marginTop: 40, textAlign: 'center' },
});
