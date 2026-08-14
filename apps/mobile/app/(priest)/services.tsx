import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePujas, usePriestProfile } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { selectPujaTypes, selectPriestProfile } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-11 (services half). `(pujasQuery.data)?.data` is not a key on
 * {pujaTypes,total,…}, so this screen always fell through to a six-row
 * hardcoded FALLBACK — with prices that contradicted the live catalogue
 * (Satyanarayan Katha ₹2,100 here vs ₹1,501 in the API) and one puja,
 * "Ganesh Atharvashirsha", that Darshya does not sell at all. A pandit was
 * reviewing, and could have quoted from, a price list that did not exist.
 *
 * The per-row Switch is gone with it. It was `useState` only — no endpoint,
 * no persistence — so a pandit could "deactivate" a service, navigate away,
 * and find it active again, having believed they had stopped taking those
 * bookings. There is no priest-service-toggle endpoint to wire it to, so the
 * screen shows the catalogue read-only and says where it can be changed.
 */
export default function PriestServices() {
  const pujasQuery = usePujas();
  const profileQuery = usePriestProfile();
  const [refreshing, setRefreshing] = useState(false);

  const services = selectPujaTypes(pujasQuery.data);
  const profile = selectPriestProfile(profileQuery.data);
  const specializations = profile?.specializations ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([pujasQuery.refetch(), profileQuery.refetch()]);
    setRefreshing(false);
  }

  const subtitle = pujasQuery.isLoading
    ? 'Loading catalogue…'
    : pujasQuery.isError
      ? 'Catalogue unavailable'
      : `${services.length} puja types on the platform`;

  return (
    <PortalScreen
      title="My Services"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
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
          These are the puja types and base prices Darshya lists. Your own
          service list and pricing are managed in the web portal — this screen
          is read-only.
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
                    s.priceInr !== null ? `₹${s.priceInr.toLocaleString('en-IN')}` : 'Price not set',
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
});
