import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { usePujas, usePriestProfile } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { selectPujaTypes, selectPriestProfile } from '../../lib/api-contracts';
import { usePriestOfferings, useTogglePriestOffering } from '../../lib/provider-queries';
import {
  countActiveOfferings,
  selectPriestOfferings,
  type PriestOfferingVM,
} from '../../lib/priest-offerings';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-11 (services half). `(pujasQuery.data)?.data` is not a key on
 * {pujaTypes,total,…}, so this screen always fell through to a six-row
 * hardcoded FALLBACK — with prices that contradicted the live catalogue
 * (Satyanarayan Katha ₹2,100 here vs ₹1,501 in the API) and one puja,
 * "Ganesh Atharvashirsha", that Darshya does not sell at all. A pandit was
 * reviewing, and could have quoted from, a price list that did not exist.
 *
 * THE PART PAR-11 GOT WRONG. It removed the per-row Switch on this reasoning:
 *
 *   "There is no priest-service-toggle endpoint to wire it to, so the screen
 *    shows the catalogue read-only and says where it can be changed."
 *
 * There is. `PriestPujaOffering` is a per-pandit table and routes/priest.ts
 * carries its whole CRUD — including `PATCH /priest/pujas/:id/toggle-active`,
 * which flips `isActive` server-side and is owner-gated. So the screen named
 * "My Services" was showing the platform's catalogue while the pandit's ACTUAL
 * service list — what devotees can book from them, at their prices — had no
 * surface in the app at all.
 *
 * Both lists are here now and each says what it is. The toggle writes to the
 * server and the row re-reads from the response; it is not local state
 * pretending to be a setting, which is the defect PAR-11 was right to delete.
 *
 * The toggle sends NO body and NO Content-Type — see lib/provider-queries.ts.
 * The handler inverts the stored value itself, and a bodyless request that
 * declares JSON is rejected by Fastify before the handler runs.
 */
export default function PriestServices() {
  const offeringsQuery = usePriestOfferings();
  const toggleOffering = useTogglePriestOffering();
  const pujasQuery = usePujas();
  const profileQuery = usePriestProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const offerings = selectPriestOfferings(offeringsQuery.data);
  const services = selectPujaTypes(pujasQuery.data);
  const profile = selectPriestProfile(profileQuery.data);
  const specializations = profile?.specializations ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([offeringsQuery.refetch(), pujasQuery.refetch(), profileQuery.refetch()]);
    setRefreshing(false);
  }

  async function onToggle(o: PriestOfferingVM) {
    setBusyId(o.id);
    try {
      await toggleOffering.mutateAsync(o.id);
    } catch (err) {
      Alert.alert(
        'Not changed',
        err instanceof Error ? err.message : 'That change did not go through.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const offeringsError = offeringsQuery.isError
    ? offeringsQuery.error instanceof Error
      ? offeringsQuery.error.message
      : 'Unknown error'
    : !offeringsQuery.isLoading && offerings === null
      ? 'The server returned an unexpected response.'
      : null;

  const subtitle =
    offeringsQuery.isLoading && offerings === null
      ? 'Loading your services…'
      : offerings === null
        ? 'Your services could not be loaded'
        : offerings.length === 0
          ? 'You list no pujas yet'
          : `${countActiveOfferings(offerings)} of ${offerings.length} active`;

  return (
    <PortalScreen
      title="My Services"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Section title="Your Pujas">
        <Text style={styles.note}>
          The pujas devotees can book directly from you. Switching one off stops
          new bookings for it; it does not affect bookings you have already
          accepted.
        </Text>
        {offeringsError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Could not load your services: {offeringsError}
            </Text>
            <Text style={styles.errorHint}>
              Nothing is listed below. That is not a report that you offer none.
              Pull down to retry.
            </Text>
          </View>
        ) : null}
        {offeringsQuery.isLoading && offerings === null ? (
          <EmptyHint text="Loading your services…" />
        ) : offerings === null ? null : offerings.length === 0 ? (
          <EmptyHint text="You have not added any pujas of your own yet. They are created in the web portal." />
        ) : (
          offerings.map((o) => (
            <View key={o.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{o.name}</Text>
                <Text style={styles.meta}>
                  {[
                    o.deity,
                    o.durationMinutes !== null ? `${o.durationMinutes} min` : null,
                    o.basePriceInr === null
                      ? 'Price not set'
                      : `₹${o.basePriceInr.toLocaleString('en-IN')}`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
                <Text style={[styles.meta, o.isActive ? styles.metaOn : styles.metaOff]}>
                  {o.isActive ? 'Accepting bookings' : 'Not accepting bookings'}
                </Text>
              </View>
              <Switch
                value={o.isActive}
                onValueChange={() => void onToggle(o)}
                disabled={busyId === o.id}
                accessibilityLabel={`${o.isActive ? 'Stop' : 'Start'} accepting bookings for ${o.name}`}
                trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
                thumbColor={o.isActive ? colors.saffron[600] : colors.stone[400]}
              />
            </View>
          ))
        )}
      </Section>

      {specializations.length > 0 ? (
        <Section title="Your Specializations">
          <View style={styles.chipWrap}>
            {specializations.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Platform Puja Catalogue">
        <Text style={styles.note}>
          These are the puja types and base prices Darshya itself lists. They are
          not yours and switching your own services above does not change them.
        </Text>
        {pujasQuery.isLoading ? (
          <EmptyHint text="Loading the catalogue…" />
        ) : pujasQuery.isError ? (
          <EmptyHint text="Could not load the catalogue. Pull down to retry." />
        ) : services.length === 0 ? (
          <EmptyHint text="No puja types are listed right now." />
        ) : (
          services.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.meta}>
                  {[
                    s.deity,
                    s.durationMinutes !== null ? `${s.durationMinutes} min` : null,
                    s.priceInr !== null
                      ? `₹${s.priceInr.toLocaleString('en-IN')}`
                      : 'Price not set',
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
            </View>
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  metaOn: { color: colors.green[600], fontWeight: '600' },
  metaOff: { color: colors.stone[400], fontWeight: '600' },
  note: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    marginBottom: spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.stone[700] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
});
