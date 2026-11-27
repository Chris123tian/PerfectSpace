import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, KeyRound, Receipt, XCircle, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { formatMoney } from '@/lib/checkout';

export default function PaymentCallbackScreen() {
  const params = useLocalSearchParams<{ ref?: string; reference?: string; trxref?: string }>();
  const reference = String(params.ref ?? params.reference ?? params.trxref ?? '');
  const { user, isLoading } = useAuth();
  const utils = trpc.useUtils();
  const verify = trpc.payments.verify.useMutation({
    onSuccess: (p) => {
      if (p.status === 'paid') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void utils.properties.list.invalidate();
      void utils.payments.mine.invalidate();
    },
  });
  const started = useRef<boolean>(false);

  useEffect(() => {
    if (started.current || isLoading || !user || !reference) return;
    started.current = true;
    verify.mutate({ reference });
  }, [isLoading, user, reference, verify]);

  const p = verify.data;
  const state = !reference
    ? 'missing'
    : verify.isError
      ? 'error'
      : !p
        ? 'loading'
        : p.status === 'paid'
          ? 'paid'
          : p.status === 'pending'
            ? 'pending'
            : 'failed';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card} testID={`payment-${state}`}>
        {state === 'loading' && (
          <>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.title}>Confirming your payment…</Text>
            <Text style={styles.sub}>This takes a few seconds.</Text>
          </>
        )}
        {state === 'paid' && p && (
          <>
            <CheckCircle2 size={56} color={Colors.success} />
            <Text style={styles.title}>Payment received</Text>
            <Text style={styles.amount}>{formatMoney(p.amount, p.currency)}</Text>
            <Text style={styles.sub}>{p.propertyTitle} is now booked for you.</Text>
            {p.releaseCode ? (
              <View style={styles.codeBox}>
                <View style={styles.codeHead}>
                  <KeyRound size={16} color={Colors.primaryDark} />
                  <Text style={styles.codeLabel}>Your release code</Text>
                </View>
                <Text style={styles.code} selectable testID="release-code">{p.releaseCode}</Text>
                <Text style={styles.codeHint}>
                  Keep it private. Give it to the landlord only after you&apos;ve moved in and everything is as agreed — it releases the money to them.
                </Text>
              </View>
            ) : null}
            <Pressable style={styles.primary} onPress={() => router.replace(`/receipt/${p.id}`)} testID="view-receipt">
              <Receipt size={16} color={Colors.white} />
              <Text style={styles.primaryText}>View receipt</Text>
            </Pressable>
          </>
        )}
        {state === 'pending' && (
          <>
            <Clock size={56} color={Colors.warning} />
            <Text style={styles.title}>Payment not completed yet</Text>
            <Text style={styles.sub}>If you approved it on your phone, give it a moment and check again.</Text>
            <Pressable style={styles.primary} onPress={() => verify.mutate({ reference })} testID="recheck-payment">
              <Text style={styles.primaryText}>Check again</Text>
            </Pressable>
          </>
        )}
        {(state === 'failed' || state === 'error' || state === 'missing') && (
          <>
            <XCircle size={56} color={Colors.error} />
            <Text style={styles.title}>{state === 'missing' ? 'No payment to check' : 'Payment didn’t go through'}</Text>
            <Text style={styles.sub}>
              {verify.error?.message ?? 'You were not charged. You can try again from the listing.'}
            </Text>
          </>
        )}
        {!user && !isLoading && reference ? <Text style={styles.sub}>Sign in to see this payment.</Text> : null}
        <Pressable style={styles.secondary} onPress={() => router.replace('/payments')} testID="go-payments">
          <Text style={styles.secondaryText}>My payments</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.link}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  amount: { fontSize: 28, fontWeight: '800', color: Colors.primaryDark },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  codeBox: { width: '100%', backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, marginTop: 6 },
  codeHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeLabel: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  code: { fontSize: 30, fontWeight: '900', letterSpacing: 4, color: Colors.primaryDark, fontVariant: ['tabular-nums'] },
  codeHint: { fontSize: 12, color: Colors.primaryDark, textAlign: 'center', lineHeight: 17 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, width: '100%', marginTop: 6 },
  primaryText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingVertical: 13, width: '100%', alignItems: 'center' },
  secondaryText: { color: Colors.text, fontWeight: '600' },
  link: { color: Colors.primary, fontWeight: '600', marginTop: 4 },
});
