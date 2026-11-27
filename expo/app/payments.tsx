import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Banknote, KeyRound, Receipt, RefreshCw, Smartphone, Wallet } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { goBack } from '@/lib/nav';
import { showAlert } from '@/lib/alert';
import { formatMoney } from '@/lib/checkout';
import { useAuth } from '@/contexts/AuthContext';
import SelectField from '@/components/SelectField';
import type { Payment, PayoutStatus } from '@/types/property';

const payoutLabel: Record<PayoutStatus, string> = {
  locked: 'Held until move-in',
  processing: 'Payout processing',
  paid: 'Paid out',
  failed: 'Payout failed',
};
const payoutColor: Record<PayoutStatus, string> = {
  locked: Colors.warning,
  processing: Colors.categoryApartment,
  paid: Colors.success,
  failed: Colors.error,
};

function StatusPill({ status }: { status: PayoutStatus }) {
  return (
    <View style={[styles.pill, { backgroundColor: payoutColor[status] + '22' }]}>
      <Text style={[styles.pillText, { color: payoutColor[status] }]}>{payoutLabel[status]}</Text>
    </View>
  );
}

export default function PaymentsScreen() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';
  const [tab, setTab] = useState<'paid' | 'earnings'>(isLandlord ? 'earnings' : 'paid');
  const utils = trpc.useUtils();
  const mine = trpc.payments.mine.useQuery(undefined, { enabled: !!user });

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.empty}>Sign in to see your payments.</Text>
      </SafeAreaView>
    );
  }

  const data = mine.data;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} hitSlop={10} testID="payments-back">
          <ArrowLeft size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'paid' && styles.tabActive]} onPress={() => setTab('paid')} testID="payments-tab-paid">
          <Text style={[styles.tabText, tab === 'paid' && styles.tabTextActive]}>I paid</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'earnings' && styles.tabActive]} onPress={() => setTab('earnings')} testID="payments-tab-earnings">
          <Text style={[styles.tabText, tab === 'earnings' && styles.tabTextActive]}>Earnings & withdraw</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => mine.refetch()} />}
        keyboardShouldPersistTaps="handled"
      >
        {mine.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : tab === 'paid' ? (
          <RenterList payments={data?.asRenter ?? []} />
        ) : (
          <Earnings
            payments={data?.asOwner ?? []}
            payouts={data?.payouts ?? []}
            saved={data?.payoutAccount ?? null}
            onDone={() => {
              void utils.payments.mine.invalidate();
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RenterList({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <Text style={styles.empty}>No payments yet. When you pay for a space, your receipt and release code show up here.</Text>;
  }
  return (
    <View style={{ gap: 12 }}>
      {payments.map((p) => (
        <View key={p.id} style={styles.card} testID={`renter-payment-${p.id}`}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle} numberOfLines={1}>{p.propertyTitle}</Text>
            <Text style={styles.cardAmount}>{formatMoney(p.amount, p.currency)}</Text>
          </View>
          <Text style={styles.meta}>
            {p.status === 'paid' ? `Paid ${p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''}` : p.status === 'failed' ? 'Failed' : 'Not completed'} · {p.reference}
          </Text>
          {p.status === 'paid' && (
            <>
              {p.payoutStatus ? <StatusPill status={p.payoutStatus} /> : null}
              {p.releaseCode && p.payoutStatus !== 'paid' ? (
                <View style={styles.codeBox}>
                  <KeyRound size={16} color={Colors.primaryDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.codeLabel}>Release code — give it to the landlord after move-in</Text>
                    <Text style={styles.code} selectable>{p.releaseCode}</Text>
                  </View>
                </View>
              ) : null}
              <Pressable style={styles.linkRow} onPress={() => router.push(`/receipt/${p.id}`)} testID={`receipt-${p.id}`}>
                <Receipt size={15} color={Colors.primary} />
                <Text style={styles.link}>Receipt</Text>
              </Pressable>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

interface Dest {
  type: 'mobile_money' | 'bank';
  recipientType: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

function Earnings({
  payments,
  payouts,
  saved,
  onDone,
}: {
  payments: Payment[];
  payouts: { id: string; propertyTitle: string; amount: number; currency: string; status: PayoutStatus; receiptNumber: string; failureReason?: string; createdAt: string; destination: Dest }[];
  saved: Dest | null;
  onDone: () => void;
}) {
  const held = payments.filter((p) => p.payoutStatus === 'locked' || p.payoutStatus === 'failed' || !p.payoutStatus);
  const currencies = useMemo(() => Array.from(new Set(payments.map((p) => p.currency))), [payments]);
  const [currency, setCurrency] = useState<string>(currencies[0] ?? 'GHS');
  useEffect(() => {
    if (currencies.length && !currencies.includes(currency)) setCurrency(currencies[0]);
  }, [currencies, currency]);

  const [type, setType] = useState<'mobile_money' | 'bank'>(saved?.type ?? 'mobile_money');
  const [bankCode, setBankCode] = useState<string>(saved?.bankCode ?? '');
  const [accountNumber, setAccountNumber] = useState<string>(saved?.accountNumber ?? '');
  const [accountName, setAccountName] = useState<string>(saved?.accountName ?? '');
  const [code, setCode] = useState<string>('');

  const banks = trpc.payments.banks.useQuery({ currency, type }, { staleTime: 3_600_000, retry: false });
  const bank = banks.data?.find((b) => b.code === bankCode);
  const resolve = trpc.payments.resolveAccount.useMutation({
    onSuccess: (r) => {
      if (r.accountName) setAccountName(r.accountName);
    },
  });
  const save = trpc.payments.savePayoutAccount.useMutation({
    onSuccess: () => {
      onDone();
      showAlert('Saved', 'Your payout account is saved. Admins can also release payouts to it.');
    },
    onError: (e) => showAlert('Could not save', e.message),
  });
  const redeem = trpc.payments.redeem.useMutation({
    onSuccess: (po) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCode('');
      onDone();
      showAlert(
        po.status === 'paid' ? 'Paid out' : 'Withdrawal started',
        `${formatMoney(po.amount, po.currency)} is on its way to ${po.destination.bankName}. ${po.failureReason ?? ''}`.trim(),
      );
    },
    onError: (e) => showAlert('Withdrawal failed', e.message),
  });
  const refresh = trpc.payments.refreshPayout.useMutation({ onSuccess: onDone });

  const destination = (): Dest | null => {
    if (!bank) {
      showAlert('Choose a provider', type === 'mobile_money' ? 'Pick your Mobile Money network.' : 'Pick your bank.');
      return null;
    }
    return {
      type,
      recipientType: bank.type || (type === 'mobile_money' ? 'mobile_money' : 'nuban'),
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
    };
  };

  const totalHeld = held.reduce((s, p) => s + p.amount, 0);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.summary}>
        <Wallet size={20} color={Colors.white} />
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Waiting for release</Text>
          <Text style={styles.summaryValue} testID="earnings-held">
            {currencies.length ? formatMoney(totalHeld, currencies[0]) : '—'}
          </Text>
        </View>
        <Text style={styles.summaryCount}>{held.length} booking{held.length === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Withdraw</Text>
        <Text style={styles.meta}>Enter the release code your renter gives you after move-in. The money goes straight to your MoMo wallet or bank account.</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="XXXX-XXXX"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          testID="release-code-input"
        />

        {currencies.length > 1 && (
          <SelectField label="Currency" value={currency} options={currencies} onChange={(v) => v && setCurrency(v)} testID="payout-currency" />
        )}

        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeBtn, type === 'mobile_money' && styles.typeBtnActive]}
            onPress={() => { setType('mobile_money'); setBankCode(''); }}
            testID="payout-type-momo"
          >
            <Smartphone size={16} color={type === 'mobile_money' ? Colors.white : Colors.text} />
            <Text style={[styles.typeText, type === 'mobile_money' && styles.typeTextActive]}>Mobile Money</Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, type === 'bank' && styles.typeBtnActive]}
            onPress={() => { setType('bank'); setBankCode(''); }}
            testID="payout-type-bank"
          >
            <Banknote size={16} color={type === 'bank' ? Colors.white : Colors.text} />
            <Text style={[styles.typeText, type === 'bank' && styles.typeTextActive]}>Bank</Text>
          </Pressable>
        </View>

        <SelectField
          label={type === 'mobile_money' ? 'Network' : 'Bank'}
          value={bankCode || null}
          displayValue={bank?.name ?? (saved && saved.bankCode === bankCode ? saved.bankName : undefined)}
          options={(banks.data ?? []).map((b) => ({ value: b.code, label: b.name }))}
          placeholder={banks.isLoading ? 'Loading…' : banks.error ? 'Unavailable until payments are switched on' : 'Select'}
          disabled={!banks.data}
          onChange={(v) => setBankCode(v ?? '')}
          testID="payout-provider"
        />
        <Text style={styles.fieldLabel}>{type === 'mobile_money' ? 'MoMo number' : 'Account number'}</Text>
        <TextInput
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          onBlur={() => {
            if (bankCode && accountNumber.trim().length >= 8) resolve.mutate({ accountNumber: accountNumber.trim(), bankCode });
          }}
          placeholder={type === 'mobile_money' ? '024 000 0000' : '0123456789'}
          placeholderTextColor={Colors.textLight}
          keyboardType="phone-pad"
          testID="payout-account-number"
        />
        <Text style={styles.fieldLabel}>Account name</Text>
        <TextInput
          style={styles.input}
          value={accountName}
          onChangeText={setAccountName}
          placeholder="Name on the account"
          placeholderTextColor={Colors.textLight}
          testID="payout-account-name"
        />
        {resolve.isPending ? <Text style={styles.meta}>Checking account name…</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primary, (redeem.isPending || code.length < 8) && styles.disabled, pressed && { opacity: 0.85 }]}
          disabled={redeem.isPending || code.length < 8}
          onPress={() => {
            const d = destination();
            if (d) redeem.mutate({ code, destination: d });
          }}
          testID="withdraw-submit"
        >
          {redeem.isPending ? <ActivityIndicator color={Colors.white} /> : null}
          <Text style={styles.primaryText}>Withdraw</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          disabled={save.isPending}
          onPress={() => {
            const d = destination();
            if (d) save.mutate({ destination: d });
          }}
          testID="payout-save-account"
        >
          <Text style={styles.secondaryText}>{save.isPending ? 'Saving…' : 'Save as my payout account'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Bookings paid to you</Text>
      {payments.length === 0 ? (
        <Text style={styles.empty}>No paid bookings yet.</Text>
      ) : (
        payments.map((p) => (
          <View key={p.id} style={styles.card} testID={`owner-payment-${p.id}`}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>{p.propertyTitle}</Text>
              <Text style={styles.cardAmount}>{formatMoney(p.amount, p.currency)}</Text>
            </View>
            <Text style={styles.meta}>From {p.renterName} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''}</Text>
            {p.payoutStatus ? <StatusPill status={p.payoutStatus} /> : null}
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Payouts</Text>
      {payouts.length === 0 ? (
        <Text style={styles.empty}>No withdrawals yet.</Text>
      ) : (
        payouts.map((o) => (
          <View key={o.id} style={styles.card} testID={`payout-${o.id}`}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>{o.propertyTitle}</Text>
              <Text style={styles.cardAmount}>{formatMoney(o.amount, o.currency)}</Text>
            </View>
            <Text style={styles.meta}>To {o.destination.bankName} · {new Date(o.createdAt).toLocaleDateString()}</Text>
            <StatusPill status={o.status} />
            {o.failureReason ? <Text style={[styles.meta, { color: Colors.error }]}>{o.failureReason}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable style={styles.linkRow} onPress={() => router.push(`/receipt/${o.id}`)}>
                <Receipt size={15} color={Colors.primary} />
                <Text style={styles.link}>Receipt</Text>
              </Pressable>
              {o.status === 'processing' && (
                <Pressable style={styles.linkRow} onPress={() => refresh.mutate({ id: o.id })} testID={`payout-refresh-${o.id}`}>
                  <RefreshCw size={15} color={Colors.primary} />
                  <Text style={styles.link}>{refresh.isPending ? 'Checking…' : 'Check status'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.white, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  scroll: { padding: 20, paddingBottom: 80, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  empty: { color: Colors.textSecondary, textAlign: 'center', marginVertical: 20, lineHeight: 20 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  cardAmount: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  meta: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, fontWeight: '700' },
  codeBox: { flexDirection: 'row', gap: 10, backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 12, alignItems: 'center' },
  codeLabel: { fontSize: 11, color: Colors.primaryDark, fontWeight: '600' },
  code: { fontSize: 22, fontWeight: '900', letterSpacing: 3, color: Colors.primaryDark },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryDark, borderRadius: 18, padding: 18 },
  summaryLabel: { color: '#CDEDE6', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  summaryCount: { color: '#CDEDE6', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginTop: 4 },
  input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  codeInput: { fontSize: 22, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { fontWeight: '600', color: Colors.text },
  typeTextActive: { color: Colors.white },
  primary: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  primaryText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.5 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
});
