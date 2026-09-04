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
import {
  selectAstrologerDetail,
  astrologerInitials,
  ratePerMinuteLabel,
} from '../../lib/astrology-directory';
import { RATE_MODE_NOTE } from '../../lib/astrologer-rate-card';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * One astrologer's public profile — the mobile counterpart of the web's
 * /astrology/view?id=… (which /astrology/[id] redirects to).
 *
 *   GET /api/v1/astrology/astrologers/:id -> { astrologer } | 404 { error }
 *
 * THE ID MUST BE A UUID. The route tests `UUID_RE` first and 404s anything
 * else, deliberately: a legacy fixture slug ('astro_001'…) used to resolve to
 * an invented person here, and `POST /consultation/book` refuses to sell
 * against one. An id the platform will not sell is an id it must not describe,
 * so a slug arriving from a stale deep link lands on the not-found state below
 * rather than on a profile.
 *
 * FIELDS DELIBERATELY ABSENT, because the endpoint has no column for them and
 * inventing one on a real person's profile is precisely the defect that put
 * fabricated RYT-500 certificates on a provider screen: certifications, gurukul
 * or lineage, temple affiliations, response time, per-mode pricing, sample
 * readings, and individual reviews. `GET /astrologers/:id/reviews` returns
 * `{ reviews: [], total: 0 }` unconditionally — there is no astrologer review
 * table — so this screen states that plainly instead of calling an endpoint
 * whose answer is already known.
 */

export default function AstrologerDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const passedName = typeof params.name === 'string' ? params.name : null;
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery<unknown>({
    queryKey: ['astrology', 'astrologer', id],
    queryFn: () => apiFetch<unknown>(`/astrology/astrologers/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
    staleTime: 60 * 1000,
    // A 404 is a fact about this id, not a transient failure. Retrying it three
    // times only delays the not-found state the devotee is already looking at.
    retry: (count, error) =>
      count < 2 && !(error instanceof Error && /\b40[0-9]\b/.test(error.message)),
  });

  const astrologer = useMemo(() => selectAstrologerDetail(query.data), [query.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const notFound =
    id.length === 0 ||
    (query.isError && query.error instanceof Error && /\b404\b/.test(query.error.message)) ||
    (query.isSuccess && astrologer === null);

  const errorText =
    !notFound && query.isError
      ? query.error instanceof Error
        ? query.error.message
        : 'Unknown error'
      : null;

  const title = astrologer?.name ?? passedName ?? 'Astrologer';

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {query.isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.centreText}>Loading this profile…</Text>
        </View>
      ) : notFound ? (
        <View style={styles.centre}>
          <Ionicons name="person-remove-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Astrologer unavailable</Text>
          <Text style={styles.centreText}>
            This profile is not in the verified directory. Only approved Darshya astrologers can
            be shown or booked.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => router.replace('/(devotee)/astrologers' as never)}
          >
            <Text style={styles.primaryBtnText}>Browse astrologers</Text>
          </TouchableOpacity>
        </View>
      ) : errorText || !astrologer ? (
        <View style={styles.centre}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.stone[300]} />
          <Text style={styles.centreTitle}>Could not load this profile</Text>
          <Text style={styles.centreText}>{errorText ?? 'Please try again.'}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={() => void query.refetch()}
          >
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.heroCard}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{astrologerInitials(astrologer.name)}</Text>
                </View>
                <View
                  style={[
                    styles.presenceDot,
                    astrologer.isOnline ? styles.presenceOn : styles.presenceOff,
                  ]}
                />
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.name}>{astrologer.name}</Text>
                {astrologer.verified ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.saffron[600]} />
                ) : null}
              </View>

              <Text style={styles.presenceLabel}>
                {astrologer.isOnline
                  ? 'Online now — at their desk'
                  : 'Offline right now — you can still request a slot'}
              </Text>

              {astrologer.rating !== null ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={colors.amber[500]} />
                  <Text style={styles.ratingValue}>{astrologer.rating.toFixed(1)}</Text>
                  {astrologer.consultationCount > 0 ? (
                    <Text style={styles.ratingCount}>
                      · {astrologer.consultationCount.toLocaleString('en-IN')} consultations
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.ratingNew}>
                  {astrologer.consultationCount > 0
                    ? `${astrologer.consultationCount.toLocaleString('en-IN')} consultations · not rated yet`
                    : 'New on Darshya · not rated yet'}
                </Text>
              )}
            </View>

            {/* ── the rate, stated once, because it is billed once ─────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Consultation rate</Text>
              <View style={styles.card}>
                {astrologer.perMinuteRate !== null ? (
                  <Text style={styles.rate}>{ratePerMinuteLabel(astrologer.perMinuteRate)}</Text>
                ) : (
                  <Text style={styles.rateUnknown}>Rate not published</Text>
                )}
                {/* PM-10: shared with the astrologer portal so the two sides of
                    the marketplace cannot be told different things. */}
                <Text style={styles.rateNote}>{RATE_MODE_NOTE}</Text>
              </View>
            </View>

            {astrologer.bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.card}>
                  <Text style={styles.bodyText}>{astrologer.bio}</Text>
                </View>
              </View>
            ) : null}

            {astrologer.specializations.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Specializations</Text>
                <View style={styles.chipRow}>
                  {astrologer.specializations.map((s) => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {astrologer.languages.length > 0 || astrologer.experienceYears !== null ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.card}>
                  {astrologer.experienceYears !== null ? (
                    <DetailRow
                      icon="ribbon-outline"
                      label="Experience"
                      value={`${astrologer.experienceYears} years`}
                    />
                  ) : null}
                  {astrologer.languages.length > 0 ? (
                    <DetailRow
                      icon="language-outline"
                      label="Speaks"
                      value={astrologer.languages.join(', ')}
                    />
                  ) : null}
                  {astrologer.isOnline && (astrologer.chat || astrologer.call) ? (
                    <DetailRow
                      icon="radio-outline"
                      label="Open right now"
                      value={[astrologer.chat ? 'Chat' : null, astrologer.call ? 'Call' : null]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Reviews: the endpoint exists and is unconditionally empty. Saying
                so is the truthful answer; a star bar with no reviews behind it
                is the invented testimonial block AW-02 deleted. */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.card}>
                <Text style={styles.bodyText}>
                  Darshya does not collect astrologer reviews yet, so there are none to show —
                  for anyone. Nothing here is filled in with a placeholder.
                </Text>
              </View>
            </View>

            <View style={{ height: spacing.xl }} />
          </ScrollView>

          {/* ── the booking bar ──────────────────────────────────────────── */}
          <View style={styles.footerBar}>
            <View style={{ flex: 1 }}>
              {astrologer.perMinuteRate !== null ? (
                <Text style={styles.footerRate}>
                  {ratePerMinuteLabel(astrologer.perMinuteRate)}
                </Text>
              ) : (
                <Text style={styles.footerRateUnknown}>Rate not published</Text>
              )}
              <Text style={styles.footerHint}>Total is quoted before you pay</Text>
            </View>
            <TouchableOpacity
              style={styles.footerBtn}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Book a consultation with ${astrologer.name}`}
              onPress={() =>
                router.push({
                  pathname: '/(devotee)/astrologer-book' as never,
                  params: { id: astrologer.id, name: astrologer.name },
                } as never)
              }
            >
              <Ionicons name="calendar-outline" size={18} color={colors.white} />
              <Text style={styles.footerBtnText}>Book a consultation</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.stone[400]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
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
    fontWeight: '800',
    color: colors.stone[900],
  },

  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  centreTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[800] },
  centreText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  primaryBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },

  body: { padding: spacing.md, gap: spacing.md },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarWrap: { width: 72, height: 72, marginBottom: spacing.xs },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.saffron[700] },
  presenceDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: colors.white,
  },
  presenceOn: { backgroundColor: colors.green[500] },
  presenceOff: { backgroundColor: colors.stone[300] },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  presenceLabel: { fontSize: fontSize.sm, color: colors.stone[500] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[700] },
  ratingCount: { fontSize: fontSize.sm, color: colors.stone[500] },
  ratingNew: { fontSize: fontSize.sm, color: colors.stone[500] },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    gap: spacing.sm,
  },
  bodyText: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 20 },
  rate: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  rateUnknown: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[400] },
  rateNote: { fontSize: fontSize.xs, color: colors.stone[500], lineHeight: 16 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron[50],
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailLabel: { fontSize: fontSize.sm, color: colors.stone[500], width: 92 },
  detailValue: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[800] },

  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
  },
  footerRate: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  footerRateUnknown: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[400] },
  footerHint: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  footerBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
});
