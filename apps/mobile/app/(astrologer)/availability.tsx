import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAstrologerDashboard } from '@poojly/api-client';
import { useSaveAstrologerAvailability } from '../../lib/provider-queries';
import {
  SLOT_LABELS,
  buildAvailabilityPayload,
  countActiveSlots,
  emptyWeek,
  parseStoredAvailability,
  type DayAvailability,
  type SlotKey,
} from '../../lib/astrologer-availability';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * NO FABRICATED SCHEDULE ON THIS SCREEN. See lib/astrologer-availability.ts for
 * the literal that used to sit here — a hardcoded fourteen-slot Mon–Sun working
 * week, seeded at mount for every astrologer, counted in the subtitle as though
 * they had set it, and published wholesale to the server the moment any one
 * switch was touched (the endpoint replaces the stored blob, it does not merge).
 *
 * What the screen does now:
 *   · reads `profile.availability` off GET /astrologer-portal/dashboard;
 *   · shows an all-off week, and says so, when nothing is stored;
 *   · says something different when the stored blob is in a shape it cannot
 *     read, because "you have set nothing" and "I cannot read what you set"
 *     are different statements and only one of them is safe to make;
 *   · disables Save until the astrologer changes something.
 */
export default function Availability() {
  const dashboardQuery = useAstrologerDashboard();
  const saveAvailability = useSaveAstrologerAvailability();

  const [slots, setSlots] = useState<DayAvailability[]>(emptyWeek);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const storedRaw = (dashboardQuery.data as { profile?: { availability?: unknown } } | undefined)
    ?.profile?.availability;
  const stored = parseStoredAvailability(storedRaw);

  // Seed from the server exactly once, and never over unsaved edits.
  useEffect(() => {
    if (hydrated || dashboardQuery.isLoading || dashboardQuery.isError) return;
    if (dashboardQuery.data === undefined) return;
    setSlots(stored ?? emptyWeek());
    setHydrated(true);
    // `stored` is derived from `dashboardQuery.data`; depending on the query
    // state is what keeps this to one seed per load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardQuery.data, dashboardQuery.isLoading, dashboardQuery.isError, hydrated]);

  function toggle(day: string, key: SlotKey) {
    setSlots((s) => s.map((it) => (it.day === day ? { ...it, [key]: !it[key] } : it)));
    setDirty(true);
  }

  async function save() {
    try {
      await saveAvailability.mutateAsync(buildAvailabilityPayload(slots));
      setDirty(false);
      Alert.alert('Saved', 'Your availability is now what this screen shows.');
    } catch (err) {
      Alert.alert(
        'Not saved',
        err instanceof Error ? err.message : 'Could not save your availability.',
      );
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      const { data } = await dashboardQuery.refetch();
      // A refresh the astrologer asked for is allowed to overwrite the grid —
      // but not silently discard edits they have not saved.
      if (!dirty) {
        const next = parseStoredAvailability(
          (data as { profile?: { availability?: unknown } } | undefined)?.profile?.availability,
        );
        setSlots(next ?? emptyWeek());
      }
    } finally {
      setRefreshing(false);
    }
  }

  const activeCount = countActiveSlots(slots);
  const unreadable = hydrated && storedRaw != null && stored === null;

  return (
    <PortalScreen
      title="Availability"
      subtitle={
        dashboardQuery.isLoading && !hydrated
          ? 'Loading your schedule…'
          : dashboardQuery.isError
            ? 'Schedule unavailable'
            : activeCount === 0
              ? 'No slots offered this week'
              : `${activeCount} ${activeCount === 1 ? 'slot' : 'slots'} offered this week`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {dashboardQuery.isError ? (
        <Text style={styles.errorBanner}>
          Your saved availability could not be loaded, so the grid below is empty
          — that is not a report that you offer no slots. Pull down to retry, and
          do not save until it loads, or you will overwrite what is stored.
        </Text>
      ) : null}

      {unreadable ? (
        <Text style={styles.warnBanner}>
          Your stored availability is in a format this screen cannot read, so the
          grid below is empty. Saving will replace whatever is stored.
        </Text>
      ) : null}

      <Section title="This Week">
        {slots.map((slot) => (
          <View key={slot.day} style={styles.dayCard}>
            <Text style={styles.dayLabel}>{slot.day}</Text>
            <View style={styles.slotsRow}>
              {SLOT_LABELS.map((s) => (
                <View key={s.key} style={styles.slotItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotName}>{s.label}</Text>
                    <Text style={styles.slotRange}>{s.range}</Text>
                  </View>
                  <Switch
                    value={slot[s.key]}
                    onValueChange={() => toggle(slot.day, s.key)}
                    disabled={dashboardQuery.isError}
                    trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
                    thumbColor={slot[s.key] ? colors.saffron[600] : colors.stone[400]}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </Section>

      {activeCount === 0 && !dirty && !dashboardQuery.isError ? (
        <EmptyHint text="You have not offered any slots yet. Switch the ones you want on, then save." />
      ) : null}

      {dirty ? (
        <TouchableOpacity
          style={[styles.saveBtn, saveAvailability.isPending && styles.saveBtnDisabled]}
          activeOpacity={0.8}
          onPress={save}
          disabled={saveAvailability.isPending}
          accessibilityRole="button"
          accessibilityLabel="Save availability"
        >
          <Text style={styles.saveText}>
            {saveAvailability.isPending ? 'Saving…' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {dirty ? (
        <Text style={styles.saveNote}>
          Saving replaces your whole week with what is shown above — the server
          stores one schedule, it does not merge changes.
        </Text>
      ) : null}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.saffron[700],
    marginBottom: spacing.sm,
  },
  slotsRow: { gap: spacing.sm },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
  },
  slotName: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  slotRange: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  errorBanner: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  warnBanner: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  saveBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  saveNote: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.stone[500],
    lineHeight: 17,
  },
});
