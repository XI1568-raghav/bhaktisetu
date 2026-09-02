import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { formatInr } from '../../lib/api-contracts';
import { PLATFORM_FEE_INR } from '../../lib/booking-flow';
import { HAS_PANDIT_VETTING, PANDIT_VETTING_CLAUSE } from '../../lib/pandit-vetting';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * One pandit's public profile — the mobile mirror of apps/web/app/pandits/[id].
 *
 *   GET /api/v1/priests/:id
 *     -> { id, displayName, avatarUrl, bio, languages[], specializations[],
 *          experienceYears, ratingAvg, ratingCount, isVerified, offeringCount,
 *          offerings[] }
 *
 * The path segment is `priests` (the API vocabulary registered at server.ts:419);
 * only the copy says "pandit". The handler 404s an id that is not a uuid and an
 * id whose row is not `isVerified AND status='active'`, so "not found" and
 * "not published" arrive as the same status — the screen says the former,
 * because from the devotee's side they are the same fact.
 *
 * FIELDS DELIBERATELY ABSENT FROM THIS SCREEN, because the endpoint has no
 * column for them and inventing one on a person's profile is the exact defect
 * found on (wellness)/profile.tsx (fabricated RYT-500 certificates):
 * certifications, gurukul/lineage, temple affiliations, years-of-study,
 * response time, completed-booking counts, individual reviews. `GET
 * /priests/:id` returns none of them. `avatarUrl` IS returned and is still not
 * rendered — see the initials note below.
 *
 * NO VERIFIED BADGE unless HAS_PANDIT_VETTING flips: `Priest.isVerified` has no
 * writer outside the two seed scripts, and this route filters on it, so it is
 * `true` for every row it can ever return. lib/pandit-vetting.ts carries the
 * whole argument and the honest sentence that replaces it.
 */

// ─── payload selectors ──────────────────────────────────────────────────────

interface PanditOffering {
  id: string;
  name: string;
  deity: string | null;
  description: string | null;
  /** Prisma Decimal over JSON — a string. null when unreadable, never 0. */
  priceInr: number | null;
  durationMinutes: number | null;
}

interface PanditProfile {
  id: string;
  displayName: string;
  bio: string | null;
  languages: string[];
  specializations: string[];
  experienceYears: number | null;
  ratingAvg: number | null;
  ratingCount: number;
  isVerified: boolean;
  offerings: PanditOffering[];
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

function selectOffering(row: unknown): PanditOffering | null {
  if (!isRecord(row)) return null;
  const id = str(row.id);
  const name = str(row.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    deity: str(row.deity),
    description: str(row.description),
    priceInr: num(row.basePrice),
    durationMinutes: num(row.durationMinutes),
  };
}

function selectPanditProfile(payload: unknown): PanditProfile | null {
  if (!isRecord(payload)) return null;
  const id = str(payload.id);
  const displayName = str(payload.displayName);
  // A 404 body is {error}. Half a profile is worse than an honest "unavailable".
  if (!id || !displayName) return null;
  const experienceYears = num(payload.experienceYears);
  return {
    id,
    displayName,
    bio: str(payload.bio),
    languages: strList(payload.languages),
    specializations: strList(payload.specializations),
    experienceYears: experienceYears !== null && experienceYears > 0 ? experienceYears : null,
    ratingAvg: num(payload.ratingAvg),
    ratingCount: num(payload.ratingCount) ?? 0,
    isVerified: payload.isVerified === true,
    offerings: (Array.isArray(payload.offerings) ? payload.offerings : [])
      .map(selectOffering)
      .filter((o): o is PanditOffering => o !== null),
  };
}

/**
 * lib/api.ts throws `API error: <status>` on a non-2xx, which is the only
 * channel this screen has for telling "no such pandit" from "the server is
 * unreachable". Retrying a 404 three times is just latency on a settled answer.
 */
function isNotFound(err: unknown): boolean {
  return err instanceof Error && /\b404\b/.test(err.message);
}

/** See the note in pandits.tsx: this app renders no remote avatars. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
  return (first + last).toUpperCase() || 'P';
}

// ─── screen ─────────────────────────────────────────────────────────────────

export default function PanditDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const passedName = typeof params.name === 'string' ? params.name : undefined;
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery<unknown>({
    queryKey: ['priests', 'public', 'detail', id],
    queryFn: () => apiFetch<unknown>(`/priests/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
    staleTime: 60 * 1000,
    retry: (count, err) => !isNotFound(err) && count < 2,
  });

  const pandit = useMemo(() => selectPanditProfile(query.data), [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const notFound = !id || isNotFound(query.error) || (query.isSuccess && pandit === null);
  const errorText =
    query.isError && !isNotFound(query.error)
      ? query.error instanceof Error
        ? query.error.message
        : 'Unknown error'
      : null;

  const title = pandit?.displayName ?? passedName ?? 'Pandit';

  function Header({ heading }: { heading: string }) {
    return (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {heading}
        </Text>
      </View>
    );
  }

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={title} />
        <ActivityIndicator color={colors.saffron[600]} style={{ marginTop: spacing['2xl'] }} />
      </SafeAreaView>
    );
  }

  if (notFound || !pandit) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header heading={notFound ? 'Pandit not found' : title} />
        <View style={styles.stateBlock}>
          <Ionicons
            name={notFound ? 'person-remove-outline' : 'cloud-offline-outline'}
            size={48}
            color={colors.stone[300]}
          />
          <Text style={styles.stateTitle}>
            {notFound ? 'This profile is not available' : 'Could not load this profile'}
          </Text>
          <Text style={styles.stateBody}>
            {notFound
              ? 'The pandit may no longer be listed in the directory.'
              : `${errorText ?? 'The server could not be reached.'}`}
          </Text>
          <TouchableOpacity
            style={styles.stateBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={notFound ? 'Back to all pandits' : 'Try again'}
            onPress={() => (notFound ? router.back() : void query.refetch())}
          >
            <Text style={styles.stateBtnText}>{notFound ? 'All pandits' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const facts: string[] = [];
  if (pandit.experienceYears !== null) facts.push(`${pandit.experienceYears}+ years experience`);
  if (pandit.languages.length > 0) facts.push(pandit.languages.join(', '));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header heading={pandit.displayName} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(pandit.displayName)}</Text>
          </View>
          <View style={styles.heroText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>
                {pandit.displayName}
              </Text>
              {/* Gated on the flag, never on the column. */}
              {HAS_PANDIT_VETTING && pandit.isVerified ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.saffron[600]} />
              ) : null}
            </View>
            {pandit.ratingCount > 0 && pandit.ratingAvg !== null ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={colors.amber[500]} />
                <Text style={styles.ratingValue}>{pandit.ratingAvg.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>
                  ({pandit.ratingCount} review{pandit.ratingCount === 1 ? '' : 's'})
                </Text>
              </View>
            ) : (
              <Text style={styles.ratingNew}>No reviews yet</Text>
            )}
            {facts.length > 0 ? <Text style={styles.facts}>{facts.join(' · ')}</Text> : null}
          </View>
        </View>

        {pandit.bio ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>About</Text>
            <Text style={styles.cardBody}>{pandit.bio}</Text>
          </View>
        ) : null}

        {pandit.specializations.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Specializations</Text>
            <View style={styles.chipRow}>
              {pandit.specializations.map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* The single trust statement this product can stand behind, shared
            byte-for-byte with apps/web and apps/api. */}
        <View style={styles.notice}>
          <Ionicons name="shield-outline" size={14} color={colors.stone[500]} />
          <Text style={styles.noticeText}>{PANDIT_VETTING_CLAUSE}.</Text>
        </View>

        {/* Services */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Puja services offered</Text>
          {pandit.offerings.length === 0 ? (
            <Text style={styles.cardBody}>
              This pandit has not listed any pujas yet.
            </Text>
          ) : (
            <>
              {pandit.offerings.map((o) => (
                <View key={o.id} style={styles.offering}>
                  <View style={styles.offeringHead}>
                    <Text style={styles.offeringName}>{o.name}</Text>
                    {o.deity ? (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{o.deity}</Text>
                      </View>
                    ) : null}
                  </View>
                  {o.description ? (
                    <Text style={styles.offeringDesc}>{o.description}</Text>
                  ) : null}
                  <View style={styles.offeringMeta}>
                    {/* The price is the server's `basePrice`, formatted and not
                        recomputed. The Rs 51 line is the fee POST
                        /bookings/from-offering adds to exactly this amount
                        (routes/bookings.ts) — quoting the base alone is the
                        CM-03 defect: a number that grows at the payment sheet. */}
                    <Text style={styles.offeringPrice}>
                      {o.priceInr === null ? 'Price on request' : formatInr(o.priceInr)}
                    </Text>
                    {o.durationMinutes !== null ? (
                      <View style={styles.offeringDuration}>
                        <Ionicons name="time-outline" size={12} color={colors.stone[400]} />
                        <Text style={styles.offeringDurationText}>{o.durationMinutes} min</Text>
                      </View>
                    ) : null}
                  </View>
                  {o.priceInr !== null ? (
                    <Text style={styles.offeringFee}>
                      {'+ '}
                      {formatInr(PLATFORM_FEE_INR)} platform fee ·{' '}
                      {formatInr(o.priceInr + PLATFORM_FEE_INR)} total
                    </Text>
                  ) : null}
                </View>
              ))}
              {/* Not a "coming soon" placeholder: a statement of what this build
                  can and cannot do, plus a control that goes somewhere real.
                  A pandit's own service is bought through
                  POST /bookings/from-offering, whose payment leg needs a
                  Razorpay checkout this binary does not carry (the same
                  constraint that makes puja-book.tsx hand its card step to the
                  website). Rather than ship a button onto a logged-out web
                  checkout, the screen says so and points at the catalogue,
                  which books end to end in the app. */}
              <Text style={styles.serviceNote}>
                These services are booked on darshya.online — the app has no card
                checkout for a pandit&apos;s own listing yet. Pujas in the
                catalogue can be booked here in full.
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Browse pujas you can book in the app"
          accessibilityHint="Opens the puja catalogue"
          onPress={() => router.push('/(devotee)/pujas' as never)}
        >
          <Ionicons name="flame-outline" size={16} color={colors.white} />
          <Text style={styles.primaryBtnText}>Browse bookable pujas</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingVertical: spacing.sm,
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
  headerTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.saffron[700] },
  heroText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  ratingValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
  ratingCount: { fontSize: fontSize.xs, color: colors.stone[400] },
  ratingNew: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4 },
  facts: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 6 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
  },
  cardHeading: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  cardBody: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[50],
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
  },
  noticeText: { flex: 1, fontSize: fontSize.xs, color: colors.stone[600], lineHeight: 16 },
  offering: {
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  offeringHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  offeringName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[800] },
  offeringDesc: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 20,
    marginTop: 4,
  },
  offeringMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  offeringPrice: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[700] },
  offeringDuration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offeringDurationText: { fontSize: fontSize.xs, color: colors.stone[500] },
  offeringFee: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 2 },
  serviceNote: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
    lineHeight: 17,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  stateBlock: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.lg, gap: spacing.sm },
  stateTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[700] },
  stateBody: { fontSize: fontSize.sm, color: colors.stone[500], textAlign: 'center' },
  stateBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
    marginTop: spacing.sm,
  },
  stateBtnText: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
});
