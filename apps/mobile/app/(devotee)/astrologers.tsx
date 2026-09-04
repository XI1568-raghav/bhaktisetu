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
  selectAstrologers,
  specializationsOf,
  onlineCountOf,
  astrologerInitials,
  ratePerMinuteLabel,
  type LiveAstrologer,
} from '../../lib/astrology-directory';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * The astrologer directory — the mobile mirror of
 * apps/web/app/astrology/astrologers (which renders LiveAstrologersClient).
 *
 *   GET /api/v1/astrology/astrologers/live
 *     -> { astrologers[], total, source: 'live' }
 *
 * WHY `/live` AND NOT `/astrologers`
 * ----------------------------------
 * Both routes now read the same `loadApprovedAstrologers` (AW-02 rebound them
 * so they cannot state different supply), but `/live` is unpaginated and its
 * ordering is online-first, which is exactly what a directory whose first
 * question is "who can talk to me right now" needs. `/astrologers` pages at 15
 * and would need a page footer to stay honest about the rest.
 *
 * NOTHING HERE IS INVENTED. Rating, consultation count, experience, languages,
 * specializations and the per-minute rate are rendered only when the payload
 * carries them. There are no photos because the payload carries no image for an
 * AstrologerProfile, and no review counts because there is no astrologer review
 * table — `GET /astrologers/:id/reviews` returns `{ reviews: [], total: 0 }`
 * unconditionally. The 15 invented astrologers that used to fill this surface
 * were deleted; this screen must never become the place they come back.
 */

const ALL = '__all__';

// ─── card ───────────────────────────────────────────────────────────────────

const AstrologerCard = React.memo(function AstrologerCard({ a }: { a: LiveAstrologer }) {
  const rate = ratePerMinuteLabel(a.perMinuteRate);

  const meta: string[] = [];
  if (a.experienceYears !== null) meta.push(`${a.experienceYears} yrs experience`);
  if (a.languages.length > 0) meta.push(a.languages.slice(0, 3).join(', '));

  const openProfile = () =>
    router.push({
      pathname: '/(devotee)/astrologer-detail' as never,
      params: { id: a.id, name: a.name },
    } as never);

  const openBooking = () =>
    router.push({
      pathname: '/(devotee)/astrologer-book' as never,
      params: { id: a.id, name: a.name },
    } as never);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHead}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={a.name}
        accessibilityHint="Opens this astrologer's profile"
        onPress={openProfile}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{astrologerInitials(a.name)}</Text>
          </View>
          <View style={[styles.presenceDot, a.isOnline ? styles.presenceOn : styles.presenceOff]} />
        </View>

        <View style={styles.cardHeadText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {a.name}
            </Text>
            {a.verified ? (
              <Ionicons name="checkmark-circle" size={15} color={colors.saffron[600]} />
            ) : null}
          </View>

          {/* A rating is printed only when a real one sits behind it. */}
          {a.rating !== null ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.amber[500]} />
              <Text style={styles.ratingValue}>{a.rating.toFixed(1)}</Text>
              {a.consultationCount > 0 ? (
                <Text style={styles.ratingCount}>
                  · {a.consultationCount.toLocaleString('en-IN')} consultations
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.ratingNew}>
              {a.consultationCount > 0
                ? `${a.consultationCount.toLocaleString('en-IN')} consultations · not rated yet`
                : 'New on Darshya · not rated yet'}
            </Text>
          )}

          {meta.length > 0 ? (
            <Text style={styles.metaText} numberOfLines={1}>
              {meta.join(' · ')}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
      </TouchableOpacity>

      {a.specializations.length > 0 ? (
        <View style={styles.chipRow}>
          {a.specializations.slice(0, 3).map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
          {a.specializations.length > 3 ? (
            <View style={[styles.chip, styles.chipMuted]}>
              <Text style={[styles.chipText, styles.chipTextMuted]}>
                +{a.specializations.length - 3}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Channels come from the astrologer's own go-online toggle. Shown only
          while they are actually online — a "Chat" affordance on someone who
          left their desk is a promise the presence store is not making. */}
      {a.isOnline && (a.chat || a.call) ? (
        <View style={styles.modeRow}>
          {a.chat ? (
            <View style={styles.modePill}>
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.green[700]} />
              <Text style={styles.modeText}>Chat</Text>
            </View>
          ) : null}
          {a.call ? (
            <View style={styles.modePill}>
              <Ionicons name="call-outline" size={12} color={colors.green[700]} />
              <Text style={styles.modeText}>Call</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardFoot}>
        <View style={{ flex: 1 }}>
          {rate ? (
            <Text style={styles.rate}>{rate}</Text>
          ) : (
            /* Decimal(10,2) with a default of 10 — a missing or zero value
               means the profile has not published a price, not that it is free. */
            <Text style={styles.rateUnknown}>Rate not published</Text>
          )}
          <Text style={styles.presenceLabel}>
            {a.isOnline ? 'Online now' : 'Offline — request a slot'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, !a.isOnline && styles.bookBtnMuted]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Book a consultation with ${a.name}`}
          onPress={openBooking}
        >
          <Text style={[styles.bookBtnText, !a.isOnline && styles.bookBtnTextMuted]}>
            {a.isOnline ? 'Consult now' : 'Book a slot'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── screen ─────────────────────────────────────────────────────────────────

export default function AstrologersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeSpec, setActiveSpec] = useState<string>(ALL);
  const [onlineOnly, setOnlineOnly] = useState(false);

  const query = useQuery<unknown>({
    queryKey: ['astrology', 'astrologers', 'live'],
    // apiFetch prefixes /api/v1 — see lib/api.ts.
    queryFn: () => apiFetch<unknown>('/astrology/astrologers/live'),
    staleTime: 60 * 1000,
  });

  /**
   * `null` means the body was not the shape this route documents — an error,
   * not an empty directory. Collapsing the two would make the screen say "no
   * astrologers are listed" in response to a 200 nobody can parse.
   */
  const parsed = useMemo(() => selectAstrologers(query.data), [query.data]);
  const astrologers = parsed ?? [];
  const unreadable = query.isSuccess && parsed === null;

  const specializations = useMemo(() => specializationsOf(astrologers), [astrologers]);
  const onlineCount = useMemo(() => onlineCountOf(astrologers), [astrologers]);

  const visible = useMemo(
    () =>
      astrologers.filter((a) => {
        if (onlineOnly && !a.isOnline) return false;
        if (activeSpec !== ALL && !a.specializations.includes(activeSpec)) return false;
        return true;
      }),
    [astrologers, onlineOnly, activeSpec],
  );

  const errorText = query.isError
    ? query.error instanceof Error
      ? query.error.message
      : 'Unknown error'
    : unreadable
      ? 'The directory answered in a shape this app does not recognise.'
      : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const subtitle = query.isLoading
    ? 'Loading verified astrologers…'
    : errorText
      ? 'Directory unavailable'
      : astrologers.length === 0
        ? 'No astrologers listed yet'
        : `${astrologers.length} verified · ${onlineCount} online now`;

  const filtered = activeSpec !== ALL || onlineOnly;

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
          <Text style={styles.headerTitle}>Astrologers</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* The one sentence this directory can stand behind, in the website's
          own words: availability is the astrologer's own go-online status. */}
      <View style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.stone[500]} />
        <Text style={styles.noticeText}>
          Every astrologer here is an approved Darshya profile. An “Online” badge means they
          are at their desk right now.
        </Text>
      </View>

      {astrologers.length > 0 ? (
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            data={[ALL, ...specializations]}
            keyExtractor={(s) => s}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.filterChip, onlineOnly && styles.filterChipActive]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: onlineOnly }}
                accessibilityLabel="Show only astrologers who are online"
                onPress={() => setOnlineOnly((v) => !v)}
              >
                <Ionicons
                  name="ellipse"
                  size={8}
                  color={onlineOnly ? colors.white : colors.green[500]}
                />
                <Text style={[styles.filterChipText, onlineOnly && styles.filterChipTextActive]}>
                  Online only
                </Text>
              </TouchableOpacity>
            }
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
        keyExtractor={(a) => a.id}
        renderItem={useCallback(
          ({ item }: { item: LiveAstrologer }) => <AstrologerCard a={item} />,
          [],
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {query.isLoading ? (
              <ActivityIndicator color={colors.saffron[600]} />
            ) : (
              <Ionicons
                name={errorText ? 'cloud-offline-outline' : 'planet-outline'}
                size={48}
                color={colors.stone[300]}
              />
            )}
            <Text style={styles.emptyText}>
              {query.isLoading
                ? 'Loading…'
                : errorText
                  ? 'Could not load the astrologer directory'
                  : filtered
                    ? 'No astrologer matches this filter'
                    : 'No astrologers are listed yet'}
            </Text>
            {errorText ? (
              <Text style={styles.emptySubtext}>
                {errorText} Nothing is shown rather than a guess — pull down to retry.
              </Text>
            ) : filtered ? (
              <>
                <Text style={styles.emptySubtext}>
                  {onlineOnly
                    ? 'Nobody is online at this moment. Clear the filter to see everyone and request a slot.'
                    : 'Try another specialization.'}
                </Text>
                <TouchableOpacity
                  style={styles.clearBtn}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  onPress={() => {
                    setOnlineOnly(false);
                    setActiveSpec(ALL);
                  }}
                >
                  <Text style={styles.clearBtnText}>Clear filters</Text>
                </TouchableOpacity>
              </>
            ) : !query.isLoading ? (
              <Text style={styles.emptySubtext}>
                No approved astrologer has gone live on Darshya so far. As soon as one is
                verified they appear here.
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    marginRight: spacing.sm,
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
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  avatarWrap: { width: 52, height: 52 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.saffron[700] },
  presenceDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  presenceOn: { backgroundColor: colors.green[500] },
  presenceOff: { backgroundColor: colors.stone[300] },
  cardHeadText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[900] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
  ratingCount: { fontSize: fontSize.xs, color: colors.stone[500] },
  ratingNew: { fontSize: fontSize.xs, color: colors.stone[500] },
  metaText: { fontSize: fontSize.xs, color: colors.stone[500] },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.saffron[50],
  },
  chipMuted: { backgroundColor: colors.stone[100] },
  chipText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.saffron[700] },
  chipTextMuted: { color: colors.stone[500] },

  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: colors.green[50],
  },
  modeText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.green[700] },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.stone[100],
    paddingTop: spacing.sm,
  },
  rate: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  rateUnknown: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[400] },
  presenceLabel: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 1 },
  bookBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[600],
  },
  bookBtnMuted: { backgroundColor: colors.saffron[50] },
  bookBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  bookBtnTextMuted: { color: colors.saffron[700] },

  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['2xl'] },
  emptyText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone[700] },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  clearBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.saffron[300],
    backgroundColor: colors.white,
  },
  clearBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },
});
