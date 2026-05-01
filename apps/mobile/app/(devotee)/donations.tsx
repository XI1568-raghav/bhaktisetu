import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useCreateDonationOrder, useVerifyDonation } from '@poojly/api-client';
import { PortalScreen } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

export default function DonationsScreen() {
  const createOrder = useCreateDonationOrder();
  const verifyDonation = useVerifyDonation();

  const [form, setForm] = useState({
    amount: '501',
    cause: 'Temple seva',
    donorName: '',
    donorEmail: '',
    donorPan: '',
  });
  const [orderId, setOrderId] = useState<string | null>(null);

  async function handleCreate() {
    const amount = Number(form.amount);
    if (!amount || amount < 1) {
      Alert.alert('Invalid amount', 'Please enter a positive amount in INR.');
      return;
    }
    if (!form.cause.trim()) {
      Alert.alert('Required', 'Please specify a cause.');
      return;
    }
    try {
      const res: any = await createOrder.mutateAsync({
        amount,
        currency: 'INR',
        cause: form.cause.trim(),
        donorName: form.donorName.trim() || undefined,
        donorEmail: form.donorEmail.trim() || undefined,
        donorPan: form.donorPan.trim() || undefined,
      });
      const url: string | undefined = res?.paymentUrl ?? res?.shortUrl ?? res?.url;
      const id: string | undefined = res?.orderId ?? res?.id;
      if (id) setOrderId(id);
      if (url) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          'Order created',
          'Payment link not returned by the server. Check the dashboard to complete payment.'
        );
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create donation order');
    }
  }

  async function handleVerify() {
    if (!orderId) {
      Alert.alert('No order', 'Create a donation first.');
      return;
    }
    try {
      const res: any = await verifyDonation.mutateAsync({ orderId });
      if (res?.verified || res?.success) {
        Alert.alert('Verified', 'Donation confirmed. 80G receipt will be emailed.');
      } else {
        Alert.alert('Pending', 'Payment not yet confirmed. Try again in a moment.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Verification failed');
    }
  }

  return (
    <PortalScreen title="Donations" subtitle="Support a cause">
      <View style={styles.card}>
        <Text style={styles.label}>Amount (INR)</Text>
        <TextInput
          style={styles.input}
          value={form.amount}
          onChangeText={(t) => setForm({ ...form, amount: t.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder="501"
        />

        <Text style={styles.label}>Cause</Text>
        <TextInput
          style={styles.input}
          value={form.cause}
          onChangeText={(t) => setForm({ ...form, cause: t })}
          placeholder="Temple seva / Gaushala / Anna daan"
        />

        <Text style={styles.label}>Donor name (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.donorName}
          onChangeText={(t) => setForm({ ...form, donorName: t })}
        />

        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.donorEmail}
          onChangeText={(t) => setForm({ ...form, donorEmail: t })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>PAN (required for 80G receipt)</Text>
        <TextInput
          style={styles.input}
          value={form.donorPan}
          onChangeText={(t) => setForm({ ...form, donorPan: t.toUpperCase() })}
          autoCapitalize="characters"
          maxLength={10}
          placeholder="ABCDE1234F"
        />

        {createOrder.isError ? (
          <Text style={styles.errorText}>
            {createOrder.error instanceof Error ? createOrder.error.message : 'Order failed'}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleCreate}
          disabled={createOrder.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>
            {createOrder.isPending ? 'Creating...' : 'Donate via Razorpay'}
          </Text>
        </TouchableOpacity>

        {orderId ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={handleVerify}
            disabled={verifyDonation.isPending}
            activeOpacity={0.8}
          >
            <Text style={styles.btnGhostText}>
              {verifyDonation.isPending ? 'Verifying...' : 'I have paid — verify donation'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[700],
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
    padding: 10,
    fontSize: fontSize.base,
    color: colors.stone[900],
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnPrimary: { backgroundColor: colors.saffron[600] },
  btnPrimaryText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: colors.stone[300], backgroundColor: colors.white },
  btnGhostText: { color: colors.stone[700], fontSize: fontSize.base, fontWeight: '700' },
  errorText: {
    color: colors.red[600],
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
});
