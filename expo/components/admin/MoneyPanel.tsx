import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Banknote, Lock, RefreshCw, Receipt, Search, Send, Smartphone, Wallet } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import SafeImage from '@/components/SafeImage';
import { trpc } from '@/lib/trpc';
import { showAlert } from '@/lib/alert';
import { formatMoney } from '@/lib/checkout';
import type { Payment, Payout } from '@/types/property';

type Filter = 'all' | 'escrow' | 'released' | 'issues';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'escrow', label: 'In escrow' },
  { id: 'released', label: 'Paid out' },
  { id: 'issues', label: 'Needs attention' },
];

function fmt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function sumByCurrency(rows: { amount: number; currency: string }[]): string {
  if (rows.length === 0) return '0';
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + r.amount);
  return [...totals.entries()].map(([c, a]) => formatMoney(a, c)).join(' · ');
}

function statusTone(p: Payment): { label: string; color: string } {
  if (p.status === 'pending') return { label: 'Awaiting payment', color: Colors.textSecondary };
  if (p.status !== 'paid') return { label: p.status === 'failed' ? 'Failed' : 'Abandoned', color: Colors.error };
  switch (p.payoutStatus) {
    case 'paid': return { label: 'Paid out', color: Colors.success };
    case 'processing': return { label: 'Payout processing', color: Colors.categoryOffice };
    case 'failed': return { label: 'Payout failed', color: Colors.error };
    default: return { label: 'In escrow', color: Colors.warning };
  }
}

interface Props { contentStyle: object }

/** Staff view of every Paystack payment, escrow and payout, with manual release for disputes. */
export default function MoneyPanel({ contentStyle }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const query = trpc.payments.adminList.useQuery(undefined, { refetchInterval: 30000 });
  const configQuery = trpc.payments.config.useQuery();
  const release = trpc.payments.adminRelease.useMutation();
  const verify = trpc.payments.adminVerify.useMutation();

  const payments = useMemo<Payment[]>(() => query.data?.payments ?? [], [query.data]);
  const payouts = useMemo<Payout[]>(() => query.data?.payouts ?? [], [query.data]);
  const payoutById = useMemo(() => new Map(payouts.map(p => [p.id, p])), [payouts]);

  const kpis = useMemo(() => {
    const paid = payments.filter(p => p.status === 'paid');
    return {
      collected: sumByCurrency(paid),
      escrow: sumByCurrency(paid.filter(p => !p.payoutStatus || p.payoutStatus === 'locked' || p.payoutStatus === 'failed')),
      paidOut: sumByCurrency(payouts.filter(p => p.status === 'paid')),
      count: paid.length,
    };
  }, [payments, payouts]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...payments]
      .filter(p => {
        if (filter === 'escrow') return p.status === 'paid' && (!p.payoutStatus || p.payoutStatus === 'locked');
        if (filter === 'released') return p.payoutStatus === 'paid' || p.payoutStatus === 'processing';
        if (filter === 'issues') return p.status === 'pending' || p.payoutStatus === 'failed';
        return true;
      })
      .filter(p => !q || [p.propertyTitle, p.renterName, p.renterEmail, p.ownerName, p.reference, p.receiptNumber ?? ''].some(s => s.toLowerCase().includes(q)))
      .sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt));
  }, [payments, filter, search]);

  const doRelease = useCallback((p: Payment) => {
    showAlert(
      'Release payout',
      `Send ${formatMoney(p.amount, p.currency)} to ${p.ownerName} now, without the renter's code? Use this only for disputes or lost codes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release', style: 'destructive',
          onPress: async () => {
            setBusy(p.id);
            try {
              await release.mutateAsync({ paymentId: p.id });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await query.refetch();
            } catch (e) {
              showAlert('Release failed', e instanceof Error ? e.message : 'Could not release the payout.');
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }, [release, query]);

  const doVerify = useCallback(async (p: Payment) => {
    setBusy(p.id);
    try {
      const res = await verify.mutateAsync({ reference: p.reference });
      await query.refetch();
      showAlert('Checked with Paystack', res.status === 'paid' ? 'Payment confirmed — the listing is now booked.' : `Status: ${res.status}`);
    } catch (e) {
      showAlert('Verify failed', e instanceof Error ? e.message : 'Could not reach Paystack.');
    } finally {
      setBusy(null);
    }
  }, [verify, query]);

  const live = configQuery.data?.paymentsEnabled ?? false;

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={Colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 12 }}>
          {!live && (
            <View style={styles.notice} testID="money-not-live">
              <Text style={styles.noticeText}>Paystack isn't connected yet — renters see "Online payment coming soon" until the secret key is added.</Text>
            </View>
          )}
          <View style={styles.kpiRow}>
            <View style={[styles.kpi, { backgroundColor: Colors.primary }]}>
              <Wallet size={18} color={Colors.white} />
              <Text style={[styles.kpiValue, { color: Colors.white }]} numberOfLines={2}>{kpis.collected}</Text>
              <Text style={[styles.kpiLabel, { color: Colors.white + 'CC' }]}>Collected · {kpis.count} payments</Text>
            </View>
            <View style={styles.kpi}>
              <Lock size={18} color={Colors.warning} />
              <Text style={styles.kpiValue} numberOfLines={2}>{kpis.escrow}</Text>
              <Text style={styles.kpiLabel}>Held in escrow</Text>
            </View>
            <View style={styles.kpi}>
              <Send size={18} color={Colors.success} />
              <Text style={styles.kpiValue} numberOfLines={2}>{kpis.paidOut}</Text>
              <Text style={styles.kpiLabel}>Paid to landlords</Text>
            </View>
          </View>
          <View style={styles.searchBox}>
            <Search size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search renter, landlord, listing, reference…"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              testID="money-search"
            />
          </View>
          <View style={styles.chips}>
            {FILTERS.map(f => (
              <Pressable key={f.id} style={[styles.chip, filter === f.id && styles.chipActive]} onPress={() => setFilter(f.id)} testID={`money-filter-${f.id}`}>
                <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} /> : (
          <View style={styles.empty}>
            <Banknote size={44} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No payments here</Text>
            <Text style={styles.emptySub}>Paystack payments from renters appear as they come in</Text>
          </View>
        )
      }
      renderItem={({ item: p }) => {
        const tone = statusTone(p);
        const payout = p.payoutId ? payoutById.get(p.payoutId) : undefined;
        const canRelease = p.status === 'paid' && p.payoutStatus !== 'paid' && p.payoutStatus !== 'processing';
        return (
          <View style={[styles.card, { borderLeftColor: tone.color }]} testID={`payment-${p.id}`}>
            <Pressable style={styles.cardTop} onPress={() => router.push(`/property/${p.propertyId}`)}>
              <SafeImage uri={p.propertyImage} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{p.propertyTitle}</Text>
                <Text style={styles.meta} numberOfLines={1}>{p.renterName} → {p.ownerName}</Text>
                <Text style={styles.amount}>{formatMoney(p.amount, p.currency)}<Text style={styles.meta}>  · {p.quantity} {p.unit}</Text></Text>
              </View>
              <View style={[styles.pill, { backgroundColor: tone.color + '18' }]}>
                <Text style={[styles.pillText, { color: tone.color }]}>{tone.label}</Text>
              </View>
            </Pressable>
            <View style={styles.details}>
              <Text style={styles.detail}>Ref {p.reference}{p.channel ? ` · ${p.channel}` : ''}</Text>
              <Text style={styles.detail}>{p.paidAt ? `Paid ${fmt(p.paidAt)}` : `Started ${fmt(p.createdAt)}`}</Text>
              {!!p.releaseCode && p.status === 'paid' && p.payoutStatus !== 'paid' && (
                <Text style={styles.detail}>Release code <Text style={styles.code}>{p.releaseCode}</Text></Text>
              )}
              {payout && (
                <View style={styles.payoutLine}>
                  {payout.destination.type === 'mobile_money' ? <Smartphone size={13} color={Colors.textSecondary} /> : <Banknote size={13} color={Colors.textSecondary} />}
                  <Text style={styles.detail}>
                    {payout.destination.bankName} · {payout.destination.accountNumber.slice(-4).padStart(payout.destination.accountNumber.length, '•')} · {payout.releasedBy === 'admin' ? 'released by staff' : 'released with code'}
                    {payout.failureReason ? ` · ${payout.failureReason}` : ''}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.actions}>
              {p.status === 'pending' && (
                <Pressable style={styles.actionBtn} onPress={() => void doVerify(p)} disabled={busy === p.id} testID={`payment-verify-${p.id}`}>
                  <RefreshCw size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Check Paystack</Text>
                </Pressable>
              )}
              {p.status === 'paid' && (
                <Pressable style={styles.actionBtn} onPress={() => router.push(`/receipt/${p.id}`)} testID={`payment-receipt-${p.id}`}>
                  <Receipt size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Receipt</Text>
                </Pressable>
              )}
              {payout && (
                <Pressable style={styles.actionBtn} onPress={() => router.push(`/receipt/${payout.id}`)} testID={`payout-receipt-${payout.id}`}>
                  <Receipt size={14} color={Colors.primary} />
                  <Text style={styles.actionText}>Payout receipt</Text>
                </Pressable>
              )}
              {canRelease && (
                <Pressable style={[styles.actionBtn, styles.releaseBtn]} onPress={() => doRelease(p)} disabled={busy === p.id} testID={`payment-release-${p.id}`}>
                  {busy === p.id ? <ActivityIndicator size="small" color={Colors.white} /> : <Send size={14} color={Colors.white} />}
                  <Text style={[styles.actionText, { color: Colors.white }]}>{p.payoutStatus === 'failed' ? 'Retry payout' : 'Release payout'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: Colors.warning + '18', borderRadius: 12, padding: 12 },
  noticeText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexGrow: 1, flexBasis: 150, backgroundColor: Colors.white, borderRadius: 16, padding: 14, gap: 6 },
  kpiValue: { fontSize: 18, fontWeight: '800' as const, color: Colors.text },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  chipText: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' as const },
  card: { backgroundColor: Colors.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderLeftWidth: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  title: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '400' as const },
  amount: { fontSize: 15, fontWeight: '800' as const, color: Colors.primary, marginTop: 3 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' as const },
  pillText: { fontSize: 11, fontWeight: '700' as const },
  details: { paddingHorizontal: 12, paddingBottom: 10, gap: 3 },
  detail: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  code: { fontWeight: '800' as const, color: Colors.text, letterSpacing: 1 },
  payoutLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.primaryLight },
  actionText: { fontSize: 12, fontWeight: '700' as const, color: Colors.primary },
  releaseBtn: { backgroundColor: Colors.primary, marginLeft: 'auto' },
});
