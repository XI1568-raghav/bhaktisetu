import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreateStripeAnnual, useIsPremium } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const BENEFITS = [
  { icon: 'videocam', text: 'Unlimited HD live darshan from 200+ temples' },
  { icon: 'flame', text: '20% off all puja bookings + free 80G receipts' },
  { icon: 'planet', text: 'Premium kundli + monthly horoscope reports' },
  { icon: 'gift', text: 'Free shipping on Darshya store orders' },
  { icon: 'people', text: 'Priority concierge for yatra & weddings' },
  { icon: 'document-text', text: 'NRI tax-friendly invoices in USD/EUR' },
] as const;

export default function UpgradeScreen() {
  const { user } = useAuth();
  const premiumQuery = useIsPremium();
  const createCheckout = useCreateStripeAnnual();
  const isPremium = premiumQuery.data?.isPremium === true;
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await premiumQuery.refetch();
    setRefreshing(false);
  }

  async function onUpgrade() {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before upgrading.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/(auth)/login' as never) },
      ]);
      return;
    }
    try {
      const res = await createCheckout.mutateAsync();
      const url = res?.url;
      if (url) {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Cannot open Stripe', 'Open the link in your browser:\n' + url);
        }
      } else {
        Alert.alert('Checkout unavailable', 'Stripe checkout could not be created. Try again later.');
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not start upgrade.';
      Alert.alert('Failed', m);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Darshya Premium</Text>
          <Text style={styles.subtitle}>NRI annual plan</Text>
        </View>
        <Ionicons name="diamond" size={26} color={colors.amber[500]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.hero}>
          <Ionicons name="sparkles" size={40} color={colors.amber[500]} />
          <Text style={styles.heroTitle}>Devotion without borders</Text>
          <Text style={styles.heroSub}>
            Annual plan for NRIs. Pay once, stay close to home.
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>$49</Text>
            <Text style={styles.priceUnit}>/year</Text>
          </View>
          <Text style={styles.priceCompare}>≈ ₹4,100 • Save 30% vs monthly</Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((b, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as never} size={18} color={colors.saffron[700]} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.activeCard}>
            <Ionicons name="checkmark-circle" size={32} color={colors.green[600]} />
            <Text style={styles.activeTitle}>You are already Premium</Text>
            <Text style={styles.activeSub}>
              Manage your subscription on the web at darshya.online/account/subscriptions.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, createCheckout.isPending && { opacity: 0.6 }]}
            onPress={onUpgrade}
            disabled={createCheckout.isPending}
            activeOpacity={0.9}
          >
            {createCheckout.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="card" size={20} color={colors.white} />
                <Text style={styles.ctaText}>Upgrade with Stripe — $49/yr</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.fineprint}>
          Stripe handles your payment securely. Cancel anytime from the web account
          page. Currency auto-detected for non-INR cards.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.stone[100],
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.md },
  hero: {
    backgroundColor: colors.saffron[600], borderRadius: borderRadius.lg,
    padding: spacing.lg, alignItems: 'center',
  },
  heroTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.sm },
  heroSub: { color: colors.saffron[100], fontSize: fontSize.sm, marginTop: 4, textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md, gap: 4 },
  priceMain: { color: colors.white, fontSize: fontSize['4xl'], fontWeight: '900' },
  priceUnit: { color: colors.amber[400], fontSize: fontSize.lg, fontWeight: '700', marginBottom: 6 },
  priceCompare: { color: colors.saffron[100], fontSize: fontSize.xs, marginTop: 4 },
  benefits: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.stone[100], gap: spacing.sm,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.saffron[50],
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { flex: 1, fontSize: fontSize.sm, color: colors.stone[800] },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.saffron[700], padding: spacing.md, borderRadius: borderRadius.md,
  },
  ctaText: { color: colors.white, fontWeight: '900', fontSize: fontSize.base },
  activeCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.green[500],
  },
  activeTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900], marginTop: spacing.xs },
  activeSub: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs, textAlign: 'center' },
  fineprint: {
    fontSize: fontSize.xs, color: colors.stone[500], textAlign: 'center',
    paddingHorizontal: spacing.md, fontStyle: 'italic',
  },
});
