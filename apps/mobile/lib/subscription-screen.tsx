import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import {
  useSubscriptionPlans,
  useMySubscription,
  useSubscribe,
  useCancelSubscription,
  usePaymentConfig,
} from '@poojly/api-client';
import { PortalScreen, EmptyHint } from './portal-screen';
import { evaluateUpgradeGate, UPGRADE_BLOCKED_MESSAGE } from './subscription-gate';
import { colors, spacing, fontSize, borderRadius } from './theme';

interface Plan {
  id: string;
  name?: string;
  description?: string;
  priceAmount?: number | string;
  amount?: number | string;
  currency?: string;
  intervalLabel?: string;
  interval?: string;
}

interface MySub {
  id?: string;
  planId?: string;
  planName?: string;
  status?: string;
  currentPeriodEnd?: string;
}

/**
 * PAR-01, provider side. This screen has the identical hazard as the devotee
 * Upgrade screen: `useSubscribe()` posts to /api/v1/subscriptions/subscribe,
 * which grants an ACTIVE paid plan and writes a COMPLETED transaction without
 * charging anything, and the screen then said "Subscription started — check the
 * dashboard to complete payment."
 *
 * Same treatment: the Subscribe control is gated on a live Razorpay key
 * reported by GET /api/v1/payments/config, and a response with no hosted
 * payment URL is a failure, not a silent success.
 */
export function SubscriptionScreen({ role }: { role: string }) {
  const plansQuery = useSubscriptionPlans({ role });
  const myQuery = useMySubscription();
  const paymentConfigQuery = usePaymentConfig();
  const subscribe = useSubscribe();
  const cancel = useCancelSubscription();

  const plans = (plansQuery.data?.plans as Plan[] | undefined) ?? [];
  const my = (myQuery.data?.subscription as MySub | null | undefined) ?? null;

  const gate = evaluateUpgradeGate({
    paymentConfig: paymentConfigQuery.data,
    configError: paymentConfigQuery.error,
    isPremium: false,
  });

  async function handleSubscribe(planId: string) {
    if (!gate.canPurchase) {
      Alert.alert('Not available', gate.message ?? UPGRADE_BLOCKED_MESSAGE);
      return;
    }
    try {
      const res: unknown = await subscribe.mutateAsync({ planId });
      const r = res as { paymentUrl?: string; shortUrl?: string; url?: string } | null;
      const url = r?.paymentUrl ?? r?.shortUrl ?? r?.url;
      if (url) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          'Checkout could not be started',
          'The payment gateway did not return a checkout page, so no payment was taken. Do not treat this plan as paid — contact support@darshya.online if it shows as active.',
        );
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not subscribe');
    }
  }

  function handleCancel() {
    Alert.alert('Cancel subscription?', 'You will keep access until the period end.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel.mutateAsync();
            Alert.alert('Cancelled', 'Subscription will not renew.');
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel');
          }
        },
      },
    ]);
  }

  return (
    <PortalScreen title="Subscription" subtitle={`Plans for ${role}`}>
      {plansQuery.isError || myQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load subscription:{' '}
            {plansQuery.error instanceof Error
              ? plansQuery.error.message
              : myQuery.error instanceof Error
                ? myQuery.error.message
                : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      {my ? (
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Current plan</Text>
          <Text style={styles.currentName}>{my.planName ?? my.planId ?? 'Active'}</Text>
          <Text style={styles.currentStatus}>
            {my.status ?? 'active'}
            {my.currentPeriodEnd
              ? ` • renews ${new Date(my.currentPeriodEnd).toLocaleDateString('en-IN')}`
              : ''}
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger]}
            onPress={handleCancel}
            disabled={cancel.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.btnDangerText}>
              {cancel.isPending ? 'Cancelling...' : 'Cancel subscription'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Available plans</Text>
      {!gate.canPurchase ? (
        <Text style={styles.gateNotice}>{gate.message ?? UPGRADE_BLOCKED_MESSAGE}</Text>
      ) : null}
      {plansQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : plans.length === 0 ? (
        <EmptyHint text="No plans available right now." />
      ) : (
        plans.map((p) => {
          const amount = Number(p.priceAmount ?? p.amount ?? 0);
          const interval = p.intervalLabel ?? p.interval ?? 'month';
          const isCurrent = my?.planId === p.id;
          return (
            <View key={p.id} style={styles.planCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planName}>{p.name ?? p.id}</Text>
                {p.description ? <Text style={styles.planDesc}>{p.description}</Text> : null}
                <Text style={styles.planPrice}>
                  ₹{amount.toLocaleString('en-IN')} / {interval}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  isCurrent || !gate.canPurchase ? styles.btnGhost : styles.btnPrimary,
                ]}
                onPress={() => (isCurrent ? null : handleSubscribe(p.id))}
                disabled={isCurrent || !gate.canPurchase || subscribe.isPending}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    isCurrent || !gate.canPurchase
                      ? styles.btnGhostText
                      : styles.btnPrimaryText
                  }
                >
                  {isCurrent
                    ? 'Current'
                    : !gate.canPurchase
                      ? 'Unavailable'
                      : subscribe.isPending
                        ? '...'
                        : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm },
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  gateNotice: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.saffron[200],
    marginBottom: spacing.md,
  },
  currentLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  currentName: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.stone[900],
    marginTop: 4,
  },
  currentStatus: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 4 },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  planName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  planDesc: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  planPrice: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
    marginTop: 4,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnPrimary: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  btnPrimaryText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  btnGhost: { backgroundColor: colors.white, borderColor: colors.stone[300] },
  btnGhostText: { color: colors.stone[700], fontSize: fontSize.sm, fontWeight: '700' },
  btnDanger: { backgroundColor: colors.white, borderColor: colors.red[500] },
  btnDangerText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '700' },
});
