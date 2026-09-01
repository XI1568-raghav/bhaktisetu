import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useCreateDonationOrder, useGaushalas, useTemples } from '@poojly/api-client';
import { PortalScreen } from '../../lib/portal-screen';
import {
  buildDonationOrderInput,
  DonationInputError,
  selectGaushalas,
  selectTemples,
  DONATION_MIN_INR,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { HAS_80G, RECEIPT_NOUN } from '../../lib/eighty-g';

/**
 * PAR-06. This screen used to POST
 *   {amount, currency, cause, donorName}
 * to /api/v1/donations/create-order, which requires
 *   {amountInr, causeKind, gaushalaId|templeId, donorPan?, dedication?}
 * — so every donation from the app came back
 *   400 {"fieldErrors":{"amountInr":["Required"]}}
 * and the user saw a bare "Invalid request body" alert. The mutation hook typed
 * its input as `unknown`, so the compiler never saw the mismatch.
 *
 * The free-text "Cause" box was the second half of the problem: the API needs a
 * real donee id, not a phrase. It is replaced by a picker over the live
 * gaushala and temple lists.
 *
 * ALSO REMOVED: the "I have paid — verify donation" button. When the server runs
 * without a Razorpay key, POST /donations/verify skips signature verification,
 * marks the donation PAID and emails an 80G tax receipt
 * (apps/api/src/routes/donations.ts). A button that mints a tax receipt for
 * money nobody sent is the same defect class as PAR-01 and does not belong in
 * the client. Confirmation must come from the gateway.
 */

const PRESET_AMOUNTS = [101, 501, 1100, 2100, 5100];

type CauseKind = 'gaushala' | 'temple';

export default function DonationsScreen() {
  const createOrder = useCreateDonationOrder();
  const gaushalasQuery = useGaushalas();
  const templesQuery = useTemples();

  const gaushalas = useMemo(
    () => selectGaushalas(gaushalasQuery.data),
    [gaushalasQuery.data],
  );
  const temples = useMemo(() => selectTemples(templesQuery.data), [templesQuery.data]);

  const [causeKind, setCauseKind] = useState<CauseKind>('gaushala');
  const [gaushalaId, setGaushalaId] = useState<string | undefined>();
  const [templeId, setTempleId] = useState<string | undefined>();
  const [amount, setAmount] = useState('501');
  const [donorPan, setDonorPan] = useState('');
  const [dedication, setDedication] = useState('');
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const donees = causeKind === 'gaushala' ? gaushalas : temples;
  const selectedId = causeKind === 'gaushala' ? gaushalaId : templeId;
  const doneesLoading =
    causeKind === 'gaushala' ? gaushalasQuery.isLoading : templesQuery.isLoading;
  const doneesError =
    causeKind === 'gaushala' ? gaushalasQuery.isError : templesQuery.isError;

  function selectDonee(id: string) {
    if (causeKind === 'gaushala') setGaushalaId(id);
    else setTempleId(id);
  }

  async function handleCreate() {
    let input;
    try {
      input = buildDonationOrderInput({
        amount,
        causeKind,
        gaushalaId,
        templeId,
        donorPan,
        dedication,
      });
    } catch (err) {
      if (err instanceof DonationInputError) {
        Alert.alert('Check your donation', err.message);
        return;
      }
      throw err;
    }

    const donee = donees.find((d) => d.id === (input.gaushalaId ?? input.templeId));

    try {
      const res = await createOrder.mutateAsync(input);
      setOrderRef(res.donationId);

      if (res.isDemoPayment) {
        // The server is running without a Razorpay key, so no order exists to
        // pay. Say exactly that. Never imply the donation went through.
        Alert.alert(
          'Payment gateway not live',
          `Your donation of ₹${input.amountInr.toLocaleString('en-IN')} was recorded (ref ${res.donationId}), but this server has no payment gateway configured, so no payment can be taken. Nothing has been charged.`,
        );
        return;
      }

      // The app has no Razorpay SDK bundled, so checkout completes on the web
      // donation form — a real route that already loads Razorpay
      // (apps/web/app/donations/page.tsx accepts causeId/causeName/causeKind).
      const url =
        'https://darshya.online/donations' +
        `?causeId=${encodeURIComponent(input.gaushalaId ?? input.templeId ?? '')}` +
        `&causeName=${encodeURIComponent(donee?.name ?? '')}` +
        `&causeKind=${input.causeKind}` +
        '&utm_source=mobile-app&utm_medium=donate';
      Alert.alert(
        'Complete your donation',
        'Payment opens in your browser — the app cannot take card or UPI payments yet.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => void Linking.openURL(url) },
        ],
      );
    } catch (err) {
      Alert.alert(
        'Donation failed',
        err instanceof Error ? err.message : 'Could not create the donation order.',
      );
    }
  }

  return (
    <PortalScreen title="Donations" subtitle="Gau seva and temple seva">
      <View style={styles.card}>
        <Text style={styles.label}>Cause</Text>
        <View style={styles.tabRow}>
          {(['gaushala', 'temple'] as const).map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.tab, causeKind === k && styles.tabActive]}
              onPress={() => setCauseKind(k)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, causeKind === k && styles.tabTextActive]}>
                {k === 'gaushala' ? 'Gaushala' : 'Temple'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          {causeKind === 'gaushala' ? 'Choose a gaushala' : 'Choose a temple'}
        </Text>
        {doneesError ? (
          <Text style={styles.errorText}>
            Could not load the list. Pull down to retry — no donation has been started.
          </Text>
        ) : doneesLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : donees.length === 0 ? (
          <Text style={styles.muted}>
            No {causeKind === 'gaushala' ? 'gaushalas' : 'temples'} are available right now.
          </Text>
        ) : (
          <ScrollView style={styles.doneeList} nestedScrollEnabled>
            {donees.map((d) => {
              const active = selectedId === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.doneeRow, active && styles.doneeRowActive]}
                  onPress={() => selectDonee(d.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.doneeName, active && styles.doneeNameActive]}>
                    {d.name}
                  </Text>
                  <Text style={styles.doneeMeta}>{d.location ?? ''}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={styles.label}>Amount (INR)</Text>
        <View style={styles.presetRow}>
          {PRESET_AMOUNTS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.preset, amount === String(p) && styles.presetActive]}
              onPress={() => setAmount(String(p))}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.presetText,
                  amount === String(p) && styles.presetTextActive,
                ]}
              >
                ₹{p.toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder={String(DONATION_MIN_INR)}
        />
        <Text style={styles.hint}>Minimum ₹{DONATION_MIN_INR}. Whole rupees only.</Text>

        <Text style={styles.label}>
          {HAS_80G ? 'PAN (required for an 80G receipt over ₹2,000)' : 'PAN (optional)'}
        </Text>
        <TextInput
          style={styles.input}
          value={donorPan}
          onChangeText={(t) => setDonorPan(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={10}
          placeholder="ABCDE1234F"
        />

        <Text style={styles.label}>Dedication (optional)</Text>
        <TextInput
          style={styles.input}
          value={dedication}
          onChangeText={setDedication}
          maxLength={200}
          placeholder="In memory of…"
        />

        {createOrder.isError ? (
          <Text style={styles.errorText}>
            {createOrder.error instanceof Error
              ? createOrder.error.message
              : 'Order failed'}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, createOrder.isPending && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={createOrder.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>
            {createOrder.isPending ? 'Creating…' : 'Donate via Razorpay'}
          </Text>
        </TouchableOpacity>

        {orderRef ? (
          <Text style={styles.hint}>
            Reference {orderRef}. Your {RECEIPT_NOUN} is emailed automatically once
            the payment is confirmed by the gateway.{HAS_80G ? '' : ' It is proof of payment, not a tax-exemption certificate.'}
          </Text>
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
    marginTop: spacing.md,
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
  hint: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4 },
  muted: { fontSize: fontSize.sm, color: colors.stone[500], paddingVertical: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.saffron[600], borderColor: colors.saffron[600] },
  tabText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[600] },
  tabTextActive: { color: colors.white },
  doneeList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.md,
  },
  doneeRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  doneeRowActive: { backgroundColor: colors.saffron[50] },
  doneeName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[800] },
  doneeNameActive: { color: colors.saffron[700] },
  doneeMeta: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  presetActive: { backgroundColor: colors.saffron[600] },
  presetText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.stone[600] },
  presetTextActive: { color: colors.white },
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
