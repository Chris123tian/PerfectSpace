import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, CreditCard, KeyRound, Lock, Minus, Plus, RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { showAlert } from '@/lib/alert';
import { openCheckout } from '@/lib/checkout';
import type { Property, User } from '@/types/property';

interface Props {
  property: Property;
  user: User | null;
  onSignIn: () => void;
}

const unitLabel = (p: Property) =>
  p.listingType === 'sale' ? 'purchase' : p.type === 'hotel' || p.durationUnit === 'night' ? 'night' : p.durationUnit === 'year' ? 'year' : 'month';

export default function PayPanel({ property, user, onSignIn }: Props) {
  const utils = trpc.useUtils();
  const config = trpc.payments.config.useQuery(undefined, { staleTime: 60_000 });
  const initialize = trpc.payments.initialize.useMutation();
  const setOccupancy = trpc.properties.setOccupancy.useMutation({
    onSuccess: () => utils.properties.list.invalidate(),
  });
  const unit = unitLabel(property);
  const minQty = unit === 'night' ? Math.max(1, property.minNights ?? 1) : 1;
  const [qty, setQty] = useState<number>(minQty);
  const booked = property.occupancy === 'booked';
  const isOwner = !!user && user.id === property.ownerId;
  const isStaff = !!user && (user.role === 'admin' || user.role === 'superadmin');
  const total = useMemo(() => Math.round(property.price * qty * 100) / 100, [property.price, qty]);
  const busy = initialize.isPending;

  const pay = async () => {
    if (!user) return onSignIn();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await openCheckout((input) => initialize.mutateAsync(input), property.id, qty);
    } catch (e) {
      showAlert('Payment', e instanceof Error ? e.message : 'Could not start the payment.');
    }
  };

  const toggle = () => {
    const next = booked ? 'available' : 'booked';
    showAlert(
      booked ? 'Reopen this listing?' : 'Mark as booked?',
      booked ? 'Renters will be able to pay for it again.' : 'Renters will see it as booked and can no longer pay for it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: booked ? 'Mark available' : 'Mark booked',
          onPress: () => setOccupancy.mutate({ id: property.id, occupancy: next }),
        },
      ],
    );
  };

  if (isOwner || isStaff) {
    return (
      <View style={styles.card} testID="occupancy-panel">
        <View style={styles.headRow}>
          <View style={[styles.statusDot, { backgroundColor: booked ? Colors.error : Colors.success }]} />
          <Text style={styles.title}>{booked ? 'Booked' : 'Available'}</Text>
        </View>
        <Text style={styles.sub}>
          {booked
            ? `Marked booked${property.bookedAt ? ' on ' + new Date(property.bookedAt).toLocaleDateString() : ''}. Reopen it when the space is free again.`
            : 'Renters can pay to secure this space through Perfect Space.'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={toggle}
          disabled={setOccupancy.isPending}
          testID="toggle-occupancy"
        >
          {setOccupancy.isPending ? <ActivityIndicator color={Colors.primary} /> : <RotateCcw size={16} color={Colors.primary} />}
          <Text style={styles.secondaryText}>{booked ? 'Mark available' : 'Mark booked'}</Text>
        </Pressable>
      </View>
    );
  }

  if (booked) {
    return (
      <View style={[styles.card, styles.bookedCard]} testID="booked-panel">
        <View style={styles.headRow}>
          <Lock size={18} color={Colors.error} />
          <Text style={[styles.title, { color: Colors.error }]}>Already booked</Text>
        </View>
        <Text style={styles.sub}>Someone has secured this space. Message the owner to join the waiting list or ask about similar places.</Text>
      </View>
    );
  }

  const enabled = config.data?.paymentsEnabled ?? false;

  return (
    <View style={styles.card} testID="pay-panel">
      <View style={styles.headRow}>
        <CreditCard size={18} color={Colors.primary} />
        <Text style={styles.title}>Secure this space</Text>
      </View>
      <Text style={styles.sub}>
        Pay with Mobile Money or card. Your money is held until you move in — you get a release code to hand the landlord once you&apos;re happy.
      </Text>

      {unit !== 'purchase' && (
        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>{unit === 'night' ? 'Nights' : unit === 'year' ? 'Years' : 'Months'}</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.max(minQty, q - 1))} testID="pay-qty-minus" hitSlop={6}>
              <Minus size={16} color={Colors.text} />
            </Pressable>
            <Text style={styles.qty} testID="pay-qty">{qty}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.min(36, q + 1))} testID="pay-qty-plus" hitSlop={6}>
              <Plus size={16} color={Colors.text} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.total} testID="pay-total">
          {property.currency}
          {total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.payBtn, (!enabled || busy) && styles.payBtnDisabled, pressed && styles.pressed]}
        onPress={pay}
        disabled={!enabled || busy}
        testID="pay-now"
      >
        {busy ? <ActivityIndicator color={Colors.white} /> : <Lock size={16} color={Colors.white} />}
        <Text style={styles.payText}>{enabled ? 'Pay securely with Paystack' : 'Online payment coming soon'}</Text>
      </Pressable>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <KeyRound size={13} color={Colors.textSecondary} />
          <Text style={styles.trustText}>Release code protects you</Text>
        </View>
        <View style={styles.trustItem}>
          <CheckCircle2 size={13} color={Colors.textSecondary} />
          <Text style={styles.trustText}>Instant receipt</Text>
        </View>
      </View>
      {user ? (
        <Pressable onPress={() => router.push('/payments')} testID="pay-my-payments">
          <Text style={styles.link}>My payments & release codes</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginBottom: 24,
    gap: 10,
  },
  bookedCard: { borderColor: '#FDE2E2', backgroundColor: '#FFF7F7' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  qtyLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.background, borderRadius: 12, padding: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  totalLabel: { fontSize: 14, color: Colors.textSecondary },
  total: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  payBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  payBtnDisabled: { backgroundColor: Colors.textLight },
  payText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  trustRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 12, color: Colors.textSecondary },
  link: { textAlign: 'center', color: Colors.primary, fontWeight: '600', fontSize: 13, marginTop: 2 },
  secondaryBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
});
