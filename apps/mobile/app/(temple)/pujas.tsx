import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePujas } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { selectPujaTypes, selectTemplePortalOfferings } from '../../lib/api-contracts';
import { useTemplePortalOfferings } from '../../lib/portal-queries';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-09. Two defects.
 *
 * 1. `.data` is not a key on {pujaTypes,…}, so this list was always empty.
 * 2. The query was the PUBLIC catalogue: fixing only the key would have shown
 *    the manager all 10 platform puja types as "your offerings", including
 *    ones this temple does not offer. The list is now
 *    GET /api/v1/temple-portal/pujas ({offerings}), which is this temple's
 *    TemplePujaOffering rows. Offering rows carry pujaTypeId but no name, so
 *    the public catalogue is still fetched — purely to resolve id → name — and
 *    an id with no catalogue row renders as the id, never as a guessed name.
 *
 * The per-row Switch is gone. It was `useState` only: flipping it changed
 * nothing server-side while looking like it had deactivated an offering. There
 * is a real PATCH /temple-portal/pujas/:id, but wiring an optimistic toggle
 * without reading back the persisted value is how "User updated (mock)" gets
 * shipped. Status is displayed read-only from `isActive` until the edit flow
 * is built.
 */
export default function TemplePujas() {
  const offeringsQuery = useTemplePortalOfferings();
  const catalogueQuery = usePujas();
  const [refreshing, setRefreshing] = useState(false);

  const catalogue = selectPujaTypes(catalogueQuery.data);
  const offerings = selectTemplePortalOfferings(offeringsQuery.data, catalogue);
  const activeCount = offerings.filter((o) => o.isActive).length;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([offeringsQuery.refetch(), catalogueQuery.refetch()]);
    setRefreshing(false);
  }

  const subtitle = offeringsQuery.isLoading
    ? 'Loading…'
    : offeringsQuery.isError
      ? 'Unavailable'
      : `${activeCount} active of ${offerings.length}`;

  return (
    <PortalScreen
      title="Puja Offerings"
      subtitle={subtitle}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* PAR-24. "Active" is `TemplePujaOffering.isActive` and nothing more. A
          devotee's booking is refused by booking.service.ts:470 unless
          `Temple.isVerified` is true — a gate on the TEMPLE, not the offering —
          so an Active offering at an unverified temple is not bookable and this
          screen would otherwise say the opposite. Nothing in /temple-portal
          reports `Temple.isVerified` (the `verified` column on TempleProfile is
          a different column and has no writer anywhere in the API), so the
          honest thing is to state the rule rather than assert a status. */}
      <View style={styles.notice}>
        <Ionicons name="information-circle" size={18} color={colors.saffron[700]} />
        <Text style={styles.noticeText}>
          “Active” means the offering is switched on. Devotees can only book it
          once Darshya has verified your temple; this screen does not report
          verification status.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.7}
        onPress={() =>
          Alert.alert('Add Puja', 'Adding or editing an offering is available on the web portal.')
        }
      >
        <Ionicons name="add-circle" size={20} color={colors.white} />
        <Text style={styles.addButtonText}>Add Puja Offering (Web)</Text>
      </TouchableOpacity>

      <Section title="Your Offerings">
        {offeringsQuery.isLoading ? (
          <EmptyHint text="Loading your offerings…" />
        ) : offeringsQuery.isError ? (
          <EmptyHint text="Could not load your offerings. Pull down to retry." />
        ) : offerings.length === 0 ? (
          <EmptyHint text="Your temple has no puja offerings configured yet." />
        ) : (
          offerings.map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{o.name}</Text>
                <Text style={styles.meta}>
                  {[
                    o.durationMinutes !== null ? `${o.durationMinutes} min` : null,
                    o.priceInr !== null
                      ? `₹${o.priceInr.toLocaleString('en-IN')}${o.hasPriceOverride ? ' (your price)' : ''}`
                      : 'Price not set',
                    o.availableSlots.length > 0
                      ? `${o.availableSlots.length} slot${o.availableSlots.length === 1 ? '' : 's'}`
                      : 'No slots — unbookable',
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  o.isActive ? styles.statusActive : styles.statusInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: o.isActive ? colors.green[600] : colors.stone[500] },
                  ]}
                >
                  {o.isActive ? 'Active' : 'Inactive'}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusActive: { backgroundColor: colors.green[50], borderColor: colors.green[600] },
  statusInactive: { backgroundColor: colors.stone[50], borderColor: colors.stone[300] },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.saffron[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  addButtonText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.saffron[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[200],
    marginBottom: spacing.md,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.saffron[700],
    lineHeight: 18,
  },
});
