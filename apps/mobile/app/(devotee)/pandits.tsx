import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import {
  HAS_PANDIT_VETTING,
  PANDIT_VETTING_CLAUSE,
  verifiedNoun,
} from '../../lib/pandit-vetting';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The pandit directory — the marketplace's supply surface, on mobile.
 *
 * THE GAP
 * -------
 * apps/web has /pandits and /pandits/[id]; apps/mobile had neither, so a
 * devotee could see pujas but never the people who perform them. This screen
 * and pandit-detail.tsx close that.
 *
 * THE ENDPOINT, AND THE NAME BRIDGE
 * ---------------------------------
 *   GET /api/v1/priests -> { priests[], total, page, limit }
 *
 * PROJECT_CONTEXT.md records the bridge: the WEB vocabulary is `priest`, the
 * ROLE vocabulary is `pandit`. The route is registered at
 * `/api/v1/priests` (apps/api/src/server.ts:419 -> routes/priests-public.ts),
 * so the PATH is `priests` and only the user-facing copy says "pandit". Calling
 * `/pandits` 404s; the two words are not interchangeable at the wire.
 *
 * WHAT THE ROUTE ALREADY GUARANTEES, so this screen does not re-assert it:
 * every row is `isVerified: true AND status: 'active'` — the filter lives in
 * the handler, not here.
 *
 * NO VERIFIED BADGE, AND WHY
 * --------------------------
 * The web card renders a check glyph on `priest.isVerified`. That column has no
 * writer outside the two seed scripts (lib/pandit-vetting.ts spells this out in
 * full), and because the route FILTERS on it, every row this screen can ever
 * receive carries `true`. A badge that is unconditionally true for the whole
 * list asserts a credential check the product does not run, on a screen that
 * sells access to human beings. It is therefore gated on HAS_PANDIT_VETTING
 * rather than deleted — flip that flag on the day the pipeline exists and the
 * badge returns, in both apps, unchanged.
 *
 * NOTHING IS INVENTED. Rating, review count, languages, experience and the
 * service count are rendered only when the payload carries them; an absent
 * field removes its row rather than falling back to a plausible-looking
 * placeholder.
 */

// ─── the payload, read defensively ──────────────────────────────────────────
// Same rule as lib/api-contracts.ts: read the key the server actually sends,
// and let an unrecognised shape yield nothing rather than something invented.

interface PanditSummary {
  id: string;
  displayName: string;
  bio: string | null;
  languages: string[];
  specializations: string[];
  /** null when the column is 0 or absent — the row is then omitted, not zeroed. */
  experienceYears: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  isVerified: boolean;
  offeringCount: number | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length > 0) : [];
}

function selectPandit(row: unknown): PanditSummary | null {
  if (!isRecord(row)) return null;
  const id = str(row.id);
  const displayName = str(row.displayName);
  // Without both there is no row to open and nothing to name it with.
  if (!id || !displayName) return null;
  const experienceYears = num(row.experienceYears);
  return {
    id,
    displayName,
    bio: str(row.bio),
    languages: strList(row.languages),
    specializations: strList(row.specializations),
    experienceYears: experienceYears !== null && experienceYears > 0 ? experienceYears : null,
    ratingAvg: num(row.ratingAvg),
    ratingCount: num(row.ratingCount) ?? 0,
    isVerified: row.isVerified === true,
    offeringCount: num(row.offeringCount),
  };
}

function selectPandits(payload: unknown): PanditSummary[] {
  if (!isRecord(payload)) return [];
  const rows = Array.isArray(payload.priests) ? payload.priests : [];
  return rows
    .map(selectPandit)
    .filter((p): p is PanditSummary => p !== null);
}

/** The TRUE total the route reports, which can exceed one page. */
function selectTotal(payload: unknown): number | null {
  return isRecord(payload) ? num(payload.total) : null;
}

// ─── initials, because this app renders no remote avatars ───────────────────
/**
 * No <Image> here on purpose. `priests.avatar_url` holds a dead host
 * (images.darshya.online) — the web card needed a whole error-fallback
 * component for it — and no screen in this app renders a remote image; every
 * one uses a glyph or an initials tile. A broken-image box on a person's
 * profile is worse than their initials.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
  return (first + last).toUpperCase() || 'P';
}

// ─── card ───────────────────────────────────────────────────────────────────

const PanditCard = React.memo(function PanditCard({ pandit }: { pandit: PanditSummary }) {
  const open = () =>
    router.push({
      pathname: '/(devotee)/pandit-detail' as never,
      params: { id: pandit.id, name: pandit.displayName },
    } as never);

  const extras: string[] = [];
  if (pandit.languages.length > 0) extras.push(pandit.languages.slice(0, 3).join(', '));
  if (pandit.experienceYears !== null) extras.push(`${pandit.experienceYears}+ yrs`);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={pandit.displayName}
      accessibilityHint="Opens this profile and the pujas they offer"
      onPress={open}
    >
      <View style={styles.cardHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(pandit.displayName)}</Text>
        </View>
        <View style={styles.cardHeadText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pandit.displayName}
            </Text>
            {/* Gated, not deleted — see the docblock at the top of this file. */}
            {HAS_PANDIT_VETTING && pandit.isVerified ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.saffron[600]} />
            ) : null}
          </View>
          {/* A rating is printed only when a real review sits behind it. */}
          {pandit.ratingCount > 0 && pandit.ratingAvg !== null ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.amber[500]} />
              <Text style={styles.ratingValue}>{pandit.ratingAvg.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({pandit.ratingCount})</Text>
            </View>
          ) : (
            <Text style={styles.ratingNew}>No reviews yet</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
      </View>

      {pandit.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {pandit.bio}
        </Text>
      ) : null}

      {pandit.specializations.length > 0 ? (
        <View style={styles.chipRow}>
          {pandit.specializations.slice(0, 3).map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
          {pandit.specializations.length > 3 ? (
            <View style={[styles.chip, styles.chipMuted]}>
              <Text style={[styles.chipText, styles.chipTextMuted]}>
                +{pandit.specializations.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {extras.length > 0 ? (
        <View style={styles.metaRow}>
          <Ionicons name="language-outline" size={12} color={colors.stone[400]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {extras.join(' · ')}
          </Text>
        </View>
      ) : null}

      {pandit.offeringCount !== null ? (
        <View style={styles.footer}>
          <Ionicons name="flame-outline" size={12} color={colors.saffron[500]} />
          <Text style={styles.footerText}>
            {pandit.offeringCount} puja service{pandit.offeringCount === 1 ? '' : 's'}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

// ─── screen ─────────────────────────────────────────────────────────────────

const ALL = '__all__';

export default function PanditsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeSpec, setActiveSpec] = useState<string>(ALL);

  const query = useQuery<unknown>({
    queryKey: ['priests', 'public', 'list'],
    // apiFetch prefixes /api/v1 — see lib/api.ts.
    queryFn: () => apiFetch<unknown>('/priests'),
    staleTime: 5 * 60 * 1000,
  });

  const pandits = useMemo(() => selectPandits(query.data), [query.data]);
  const total = selectTotal(query.data);

  /**
   * The filter is derived from the rows that actually arrived, and applied
   * here rather than sent to the server.
   *
   * The route does accept `?specialization=`, but it lowercases the input and
   * matches `specializations: { has: <value> }` — an EXACT array-element match.
   * A stored value with any capitalisation therefore returns an empty page for
   * its own label, which is a control that looks alive and answers "none". The
   * directory is capped at 100 rows (PUBLIC_PRIESTS_MAX_LIMIT) and this screen
   * holds the page it drew the labels from, so filtering locally is exact by
   * construction and cannot dead-end.
   */
  const specializations = useMemo(() => {
    const seen = new Set<string>();
    for (const p of pandits) for (const s of p.specializations) seen.add(s);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [pandits]);

  const visible = useMemo(
    () =>
      activeSpec === ALL
        ? pandits
        : pandits.filter((p) => p.specializations.includes(activeSpec)),
    [pandits, activeSpec],
  );

  const errorText = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : 'Unknown error'
    : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const subtitle = query.isLoading
    ? 'Loading the directory…'
    : errorText
      ? 'Directory unavailable'
      : `${pandits.length} ${verifiedNoun('pandits')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pandits</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* The one trust sentence this product can actually stand behind. Shared
          byte-for-byte with apps/web and apps/api via lib/pandit-vetting.ts. */}
      <View style={styles.notice}>
        <Ionicons name="shield-outline" size={14} color={colors.stone[500]} />
        <Text style={styles.noticeText}>{PANDIT_VETTING_CLAUSE}.</Text>
      </View>

      {specializations.length > 1 ? (
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            data={[ALL, ...specializations]}
            keyExtractor={(s) => s}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            renderItem={({ item }) => {
              const active = activeSpec === item;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={item === ALL ? 'All specializations' : item}
                  onPress={() => setActiveSpec(item)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item === ALL ? 'All' : item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        renderItem={useCallback(
          ({ item }: { item: PanditSummary }) => <PanditCard pandit={item} />,
          [],
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={
          /* The route pages at 100 and reports a true total. Saying so beats
             letting the list end and implying that is everyone. */
          total !== null && total > pandits.length ? (
            <Text style={styles.footerNote}>
              Showing the first {pandits.length} of {total}.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {query.isLoading ? (
              <ActivityIndicator color={colors.saffron[600]} />
            ) : (
              <Ionicons
                name={errorText ? 'cloud-offline-outline' : 'people-outline'}
                size={48}
                color={colors.stone[300]}
              />
            )}
            <Text style={styles.emptyText}>
              {query.isLoading
                ? 'Loading…'
                : errorText
                  ? 'Could not load the pandit directory'
                  : activeSpec !== ALL
                    ? 'No one listed under this specialization'
                    : 'No pandits listed yet'}
            </Text>
            {errorText ? (
              <Text style={styles.emptySubtext}>{errorText} — pull down to retry.</Text>
            ) : !query.isLoading && activeSpec === ALL ? (
              <Text style={styles.emptySubtext}>
                Profiles appear here once a pandit is onboarded and active.
              </Text>
            ) : null}
          </View>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.stone[100],
  },
  noticeText: { flex: 1, fontSize: fontSize.xs, color: colors.stone[600], lineHeight: 16 },
  filterBar: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  filterScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  filterChipActive: { backgroundColor: colors.saffron[600] },
  filterChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[500] },
  filterChipTextActive: { color: colors.white },
  listContent: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    minHeight: 44,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[700] },
  cardHeadText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
  ratingCount: { fontSize: fontSize.xs, color: colors.stone[400] },
  ratingNew: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  bio: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[50],
  },
  chipMuted: { backgroundColor: colors.stone[100] },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },
  chipTextMuted: { color: colors.stone[500] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  metaText: { flex: 1, fontSize: fontSize.xs, color: colors.stone[500] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  footerText: { fontSize: fontSize.xs, color: colors.stone[500] },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    textAlign: 'center',
    paddingTop: spacing.md,
  },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.stone[600] },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
