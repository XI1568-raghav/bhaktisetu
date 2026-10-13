import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { apiFetch } from '../../lib/api';

/**
 * The sacred calendar — festivals and vrats, from the panchang the API already
 * computes.
 *
 * WHY THIS SCREEN EXISTS AND WHY IT IS BUILT THIS WAY
 * --------------------------------------------------
 * The website carries ~130 devotional content routes. Almost all of them read
 * a hardcoded TypeScript array in apps/web/lib — festivals.ts (1,280 lines),
 * vrats.ts (2,192), ekadashis.ts, tithis.ts, and thirty more, 23,253 lines in
 * total — with NO API in front of any of it. Porting those to mobile means
 * copying the arrays into the app bundle, where they immediately begin to
 * drift from the web copy. That has already happened once in this repo, to
 * wedding prices, which differed FIVE-FOLD between web and mobile for exactly
 * this reason. So those families stay web-only and this screen does not
 * pretend otherwise.
 *
 * Festivals and vrats are the exception, and the exception is the whole point:
 * they are NOT web-local arrays. They are rows of `DailyPanchang`, served by
 * `GET /api/v1/panchang/festivals` and `GET /api/v1/panchang/vrats`, which
 * have been live and unused by this app the entire time. Verified against
 * production on 2026-09-08: 13 festivals and 143 vrats inside a year. One
 * source of truth, already deployed, reachable by both clients — nothing is
 * copied into this bundle, so nothing here can drift.
 *
 * NOTHING ON THIS SCREEN IS WRITTEN BY THE APP.
 * --------------------------------------------
 * Every name, tithi, nakshatra and note is the server's string, rendered or
 * omitted. A row missing its date or its name is dropped rather than
 * completed — the same rule content.tsx was rewritten to obey after it shipped
 * twelve invented aartis with invented deities and durations.
 */

type Feed = 'festivals' | 'vrats';

interface CalendarEntry {
  /** ISO date from the server. The list key, and the reason a row can exist. */
  date: string;
  /** Festival or vrat name. */
  name: string;
  tithi: string | null;
  nakshatra: string | null;
  /** The server's note. Null when it sent none — never a written-in blurb. */
  specialInfo: string | null;
}

/**
 * A year. The endpoints clamp at 365 server-side (`Math.min(days, 365)`), and
 * a shorter horizon silently hides real observances: 30 days returns 4
 * festivals where 365 returns 13.
 */
const HORIZON_DAYS = 365;

const FEEDS: { key: Feed; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'festivals', label: 'Festivals', icon: 'sparkles' },
  { key: 'vrats', label: 'Vrats', icon: 'moon' },
];

// ─── selectors ──────────────────────────────────────────────────────────────
//
// Pure, no react-native import, so they parse under the plain-node vitest
// config the way content.tsx's selectors do.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/**
 * `{ festivals: [...] }` / `{ vrats: [...] }` -> rows this screen can render.
 *
 * The two endpoints differ by one key: the name lives under `festival` in one
 * payload and `vrat` in the other, inside an envelope named the same way. Both
 * are read here rather than in two near-identical screens.
 */
function selectCalendarEntries(payload: unknown, feed: Feed): CalendarEntry[] {
  if (!isRecord(payload)) return [];
  const rows = payload[feed];
  if (!Array.isArray(rows)) return [];
  const nameKey = feed === 'festivals' ? 'festival' : 'vrat';
  return rows
    .filter(isRecord)
    .map((r): CalendarEntry | null => {
      const date = str(r.date);
      const name = str(r[nameKey]);
      // A row with no date cannot be placed in a calendar and a row with no
      // name has nothing to announce. Neither is invented.
      if (!date || !name || Number.isNaN(new Date(date).getTime())) return null;
      return {
        date,
        name,
        tithi: str(r.tithi),
        nakshatra: str(r.nakshatra),
        specialInfo: str(r.specialInfo),
      };
    })
    .filter((e): e is CalendarEntry => e !== null);
}

/** `2026-09-20T00:00:00.000Z` -> `20 Sep 2026`. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** `20 Sep` on two lines in the date chip. */
function dayOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : String(d.getUTCDate());
}

function monthOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
}

/** Month headings, in the order the server sent the rows (already ascending). */
function groupByMonth(entries: CalendarEntry[]): { title: string; data: CalendarEntry[] }[] {
  const sections: { title: string; data: CalendarEntry[] }[] = [];
  for (const e of entries) {
    const d = new Date(e.date);
    const title = Number.isNaN(d.getTime())
      ? 'Upcoming'
      : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(e);
    else sections.push({ title, data: [e] });
  }
  return sections;
}

const EntryRow = React.memo(function EntryRow({ item, tint }: { item: CalendarEntry; tint: string }) {
  // Not a TouchableOpacity: there is no detail screen for a panchang entry and
  // no endpoint behind one. A row that looks tappable and does nothing is the
  // defect class this codebase removes rather than ships.
  return (
    <View style={styles.card}>
      <View style={[styles.dateChip, { backgroundColor: `${tint}18` }]}>
        <Text style={[styles.dateDay, { color: tint }]}>{dayOf(item.date)}</Text>
        <Text style={[styles.dateMonth, { color: tint }]}>{monthOf(item.date)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        {/* Each meta line appears only when the server sent that field. */}
        <View style={styles.metaRow}>
          {item.tithi ? <Text style={styles.meta}>{item.tithi}</Text> : null}
          {item.nakshatra ? <Text style={styles.meta}>{item.nakshatra}</Text> : null}
        </View>
        {item.specialInfo ? <Text style={styles.note}>{item.specialInfo}</Text> : null}
      </View>
    </View>
  );
});

export default function FestivalsScreen() {
  const [feed, setFeed] = useState<Feed>('festivals');
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (which: Feed) => {
    try {
      const payload = await apiFetch<unknown>(`/panchang/${which}?days=${HORIZON_DAYS}`);
      setEntries(selectCalendarEntries(payload, which));
      setError(null);
    } catch (e) {
      // The list is emptied along with the error being stated, so a stale
      // festival list cannot sit under a failure message pretending to be
      // current.
      setEntries([]);
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    load(feed).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [feed, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(feed);
    setRefreshing(false);
  }, [feed, load]);

  const sections = useMemo(() => groupByMonth(entries), [entries]);
  const tint = feed === 'festivals' ? colors.saffron[600] : colors.green[600];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.stone[900]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sacred Calendar</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading…' : `${entries.length} in the year ahead`}
          </Text>
        </View>
      </View>

      <View style={styles.segmentContainer}>
        <View style={styles.segmentControl}>
          {FEEDS.map((f) => {
            const isActive = feed === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                onPress={() => setFeed(f.key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={f.label}
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? colors.white : colors.stone[500]}
                />
                <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.date}-${item.name}`}
        renderItem={({ item }) => <EntryRow item={item} tint={tint} />}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.saffron[600]} />
              <Text style={styles.emptyText}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
              <Text style={styles.emptyText}>Could not load the calendar</Text>
              <Text style={styles.emptySubtext}>{error} — pull down to retry.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.stone[300]} />
              <Text style={styles.emptyText}>
                No {feed === 'festivals' ? 'festivals' : 'vrats'} in the year ahead
              </Text>
              <Text style={styles.emptySubtext}>
                The panchang is calculated ahead of time — pull down to check again.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    marginLeft: -spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.base, color: colors.stone[500], marginTop: 2 },
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: colors.saffron[600],
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[500] },
  segmentTextActive: { color: colors.white },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.stone[500],
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.xs,
  },
  dateChip: {
    width: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  dateDay: { fontSize: fontSize.xl, fontWeight: '800' },
  dateMonth: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardDate: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  meta: {
    fontSize: fontSize.xs,
    color: colors.stone[600],
    backgroundColor: colors.stone[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  note: { fontSize: fontSize.sm, color: colors.stone[600], marginTop: spacing.xs, lineHeight: 20 },
  emptyState: { alignItems: 'center', padding: spacing.xl, gap: spacing.xs },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.stone[600] },
  emptySubtext: { fontSize: fontSize.sm, color: colors.stone[400], textAlign: 'center' },
});
