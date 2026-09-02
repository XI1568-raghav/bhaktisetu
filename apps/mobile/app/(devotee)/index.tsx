import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDarshan, usePujas, usePanchang } from '@poojly/api-client';
import { selectLiveStreams, selectPujaTypes, selectPanchang } from '../../lib/api-contracts';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

import { useExitConfirm } from '../../lib/use-exit-confirm';
import {
  gridWidthPercent,
  useCarouselCardWidth,
  useResponsiveGrid,
} from '../../lib/use-responsive';

// PAR-07: FALLBACK_DARSHAN and FALLBACK_PUJAS lived here. Both accessors
// (`darshan.data?.data`, `pujas.data?.data`) read a key the API does not send,
// so the home screen permanently showed three invented "live" temples and four
// invented pujas whose prices contradicted the website
// (Satyanarayan Katha ₹2,100 here vs ₹1,501 in the catalogue; "Ganesh
// Atharvashirsha" is not a puja Darshya sells at all). Deleted, not repaired:
// a fallback that is indistinguishable from real inventory is worse than an
// empty shelf.

// NAV-01: read at module scope, exactly as app/(devotee)/knowledge.tsx reads
// it, so the home entry and the hub can never disagree about whether the
// Knowledge Hub is in this build. `process.env.EXPO_PUBLIC_*` is inlined by
// the Expo bundler at build time — this is a constant, not a runtime lookup,
// so it must be compared the same way in both files.
const KNOWLEDGE_ENABLED = process.env.EXPO_PUBLIC_KNOWLEDGE_ENABLED === 'true';

export default function HomeScreen() {
  // Android: guard the app's exit point. This screen is a stack root
  // (index.tsx router.replace()s here), so back would otherwise quit
  // outright with no confirmation. No-op on iOS.
  useExitConfirm();

  // Live geometry. Both of these re-render on rotation, iPad Split View /
  // Slide Over and Android foldable unfold; the module-scope
  // `Dimensions.get('window')` they replace was read once at import and never
  // updated again.
  const darshanCardWidth = useCarouselCardWidth();
  const { columns } = useResponsiveGrid();
  const pujaCardWidth = gridWidthPercent(columns);

  const { user } = useAuth();
  const darshan = useDarshan();
  const pujas = usePujas({ pageSize: 4 });
  const panchang = usePanchang();

  const [refreshing, setRefreshing] = React.useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([darshan.refetch(), pujas.refetch(), panchang.refetch()]);
    setRefreshing(false);
  }

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const darshanList = selectLiveStreams(darshan.data)
    .filter((s) => s.isLive)
    .slice(0, 3);

  // PujaType DOES carry price — every row has basePrice and nriPrice. The old
  // comment here claimed otherwise and substituted mock rupee figures.
  const pujaList = selectPujaTypes(pujas.data).slice(0, 4);

  // PAR-08: /api/v1/panchang/today returns a FLAT object, so every
  // `panchang.data?.data?.x` accessor resolved to undefined and this card
  // rendered the same six literal strings every day of the year — a fabricated
  // tithi, which for a devotional product is a credibility-ending error. The
  // API key is `rahuKaal`, not `rahukaal` (a second, independent mismatch), and
  // `shubhMuhurat` is an OBJECT of three named windows, not a string: rendering
  // it straight into <Text> throws "Objects are not valid as a React child" and
  // takes the whole home screen down. selectPanchang handles all three and
  // returns null — never a default day — for an error body.
  const panchangData = selectPanchang(panchang.data);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Namaste{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 🙏
            </Text>
            <Text style={styles.dateText}>{todayDate}</Text>
          </View>
          {/* NAV-01. This was a NOTIFICATIONS BELL wired to the profile
              screen. There is no notifications screen in app/(devotee) — the
              inbox is `messages`, and the bell never went there either — so
              the glyph promised an unread-alerts surface that does not exist
              and delivered account settings instead. The destination is real
              and useful, so the honest fix is to correct the icon and label
              rather than delete the control. It also had no accessible name
              at all, and a 40pt box below the 44pt minimum. */}
          <TouchableOpacity
            style={styles.bellButton}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            accessibilityHint="Opens your profile"
            onPress={() => router.push('/(devotee)/profile' as any)}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.stone[700]} />
          </TouchableOpacity>
        </View>

        {/* PAR-22. This control has now been wrong twice, in opposite
            directions.

            First it was a search affordance that did not search: a magnifying
            glass over "Search pujas, temples, content…" whose onPress was a
            plain tab push. The remediation relabelled it "Browse all pujas"
            and justified that by asserting the app had nothing to query —
            that only apps/web/app/search existed. The assertion was false;
            two public, unauthenticated routes were already live:

              GET /api/v1/temples/search   apps/api/src/routes/temples.ts:127
              GET /api/v1/content/search   apps/api/src/routes/content.ts:47

            So the honest control is the search box, and it now opens a screen
            that actually queries both. The placeholder names only what is
            really searched: temples and devotional content. Pujas have no
            /search route, so they stay named as the tab they are, and
            docs/mobile-v1-scope.md records that exclusion. */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          accessibilityRole="search"
          accessibilityLabel="Search temples and devotional content"
          accessibilityHint="Opens search"
          onPress={() => router.push('/(devotee)/search' as any)}
        >
          <Ionicons name="search-outline" size={18} color={colors.stone[500]} />
          <Text style={styles.searchPlaceholder}>Search temples and aartis</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.stone[400]} />
        </TouchableOpacity>

        {!user && (
          <TouchableOpacity
            style={styles.waitlistCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(onboard)/waitlist' as any)}
          >
            <View style={styles.waitlistIcon}>
              <Ionicons name="sparkles" size={20} color={colors.saffron[700]} />
            </View>
            <View style={styles.waitlistText}>
              <Text style={styles.waitlistTitle}>Join the Darshya waitlist</Text>
              <Text style={styles.waitlistSubtitle}>
                Reserve your early-access spot. Daily panchang on email.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.saffron[700]}
            />
          </TouchableOpacity>
        )}

        {/* NAV-01. `Find a pandit` is new here, and it is the entry that was
            missing: (devotee)/pandits.tsx — the directory of the priests who
            perform every ritual in the catalogue — had ZERO inbound
            navigation anywhere in app/ or lib/. It is the supply half of a
            two-sided marketplace and it was reachable only by deep link.

            `quickActionsRow` already sets flexWrap, and each action is
            minWidth 64 over a 44pt icon, so a sixth (and, when the flag is
            on, a seventh) entry wraps to a second line instead of crushing
            the row on a small phone.

            Every destination below is verified to exist on disk and to be
            declared in (devotee)/_layout.tsx. Nothing is linked speculatively:
            a push to a missing route lands on the not-found screen. */}
        <View style={styles.quickActionsRow}>
          <QuickAction icon="people" label="Pandits" hint="Opens the directory of pandits" onPress={() => router.push('/(devotee)/pandits' as any)} />
          <QuickAction icon="planet" label="Kundli" onPress={() => router.push('/(devotee)/kundli' as any)} />
          <QuickAction icon="star" label="Horoscope" onPress={() => router.push('/(devotee)/horoscope' as any)} />
          <QuickAction icon="map" label="Yatra" onPress={() => router.push('/(devotee)/yatra' as any)} />
          <QuickAction icon="heart" label="Weddings" onPress={() => router.push('/(devotee)/weddings' as any)} />
          {/* Gated on the SAME build-time flag the hub itself reads. With the
              flag off, knowledge.tsx renders "launching soon" — so an entry
              would be a control that leads to an apology, which this surface
              does not ship. eas.json turns it on for preview, production and
              testflight; .env.example leaves it off for local dev. */}
          {KNOWLEDGE_ENABLED ? (
            <QuickAction icon="book" label="Knowledge" hint="Sanskrit, Vedas and Sanatan Dharma" onPress={() => router.push('/(devotee)/knowledge' as any)} />
          ) : null}
          <QuickAction icon="diamond" label="Premium" onPress={() => router.push('/(devotee)/upgrade' as any)} />
        </View>

        <View style={styles.panchangCard}>
          <View style={styles.panchangHeader}>
            <Ionicons name="sunny" size={18} color={colors.amber[500]} />
            <Text style={styles.panchangTitle}>Today&apos;s Panchang</Text>
          </View>
          {panchang.isLoading && !panchangData ? (
            <Text style={styles.panchangUnavailable}>Loading…</Text>
          ) : !panchangData ? (
            <Text style={styles.panchangUnavailable}>
              Panchang unavailable right now. Pull down to retry.
            </Text>
          ) : (
            <>
              <View style={styles.panchangRow}>
                <PanchangItem label="Tithi" value={panchangData.tithi} />
                <PanchangItem label="Nakshatra" value={panchangData.nakshatra} />
              </View>
              <View style={styles.panchangRow}>
                <PanchangItem label="Sunrise" value={panchangData.sunrise} />
                <PanchangItem label="Sunset" value={panchangData.sunset} />
              </View>
              <View style={styles.panchangRow}>
                <PanchangItem label="Rahu Kaal" value={panchangData.rahuKaal} />
              </View>
              {panchangData.muhurats.length > 0 ? (
                <View style={styles.auspiciousWrap}>
                  {panchangData.muhurats.map((m) => (
                    <View key={m.label} style={styles.auspiciousBadge}>
                      <Ionicons name="star" size={14} color={colors.amber[600]} />
                      <Text style={styles.auspiciousText}>
                        {m.label}: {m.window}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {panchangData.locationCity ? (
                <Text style={styles.panchangCity}>
                  Timings for {panchangData.locationCity}
                </Text>
              ) : null}
            </>
          )}
        </View>

        {/* Live Darshan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Darshan</Text>
            <TouchableOpacity onPress={() => router.push('/(devotee)/darshan' as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {darshan.isLoading && !darshan.data ? (
            <ActivityIndicator size="small" color={colors.saffron[600]} style={{ paddingVertical: spacing.lg }} />
          ) : darshanList.length === 0 ? (
            <Text style={styles.sectionEmpty}>
              {darshan.isError
                ? 'Live darshan is unavailable right now.'
                : 'No temple is broadcasting at the moment.'}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {darshanList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.darshanCard, { width: darshanCardWidth }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/(devotee)/darshan-player' as never,
                      params: {
                        id: item.id,
                        title: item.templeName,
                        deity: item.deity ?? '',
                        ...(item.playbackUrl ? { url: item.playbackUrl } : {}),
                      },
                    } as never)
                  }
                >
                  <View style={styles.darshanThumb}>
                    <Ionicons name="videocam" size={36} color={colors.white} />
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  </View>
                  <View style={styles.darshanInfo}>
                    <Text style={styles.darshanTitle} numberOfLines={1}>{item.templeName}</Text>
                    <Text style={styles.darshanSub} numberOfLines={1}>
                      {[item.deity, item.city].filter(Boolean).join(' • ')}
                    </Text>
                    {item.viewerCount !== null && item.viewerCount > 0 ? (
                      <View style={styles.viewersRow}>
                        <Ionicons name="eye" size={12} color={colors.stone[500]} />
                        <Text style={styles.viewersText}>
                          {item.viewerCount.toLocaleString('en-IN')} watching
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Popular Pujas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Pujas</Text>
            <TouchableOpacity onPress={() => router.push('/(devotee)/pujas' as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {pujas.isLoading && !pujas.data ? (
            <ActivityIndicator size="small" color={colors.saffron[600]} style={{ paddingVertical: spacing.lg }} />
          ) : pujaList.length === 0 ? (
            <Text style={styles.sectionEmpty}>
              {pujas.isError
                ? 'The puja catalogue could not be loaded.'
                : 'No pujas are listed right now.'}
            </Text>
          ) : (
            /* NAV-01. Every one of these four cards used to `router.push`
               the pujas TAB — the same destination, regardless of which puja
               was tapped. The devotee tapped "Satyanarayan Katha ₹1,501" and
               landed on an unfiltered catalogue with the tap discarded, which
               is a control that leads nowhere in the only sense that matters:
               it does not lead where it says it does.

               The row already carries `slug` (selectPujaTypes reads it off
               the API), and (devotee)/puja-detail.tsx takes exactly
               `{ slug, name }` — so the card now opens the puja it shows.
               "See All" above still goes to the tab, which is what that
               control is for. */
            <View style={styles.pujaGrid}>
              {pujaList.map((puja) => (
                <TouchableOpacity
                  key={puja.id}
                  style={[styles.pujaCard, { width: pujaCardWidth }]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={puja.name}
                  accessibilityHint={`Opens details for ${puja.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(devotee)/puja-detail' as never,
                      params: { slug: puja.slug, name: puja.name },
                    } as never)
                  }
                >
                  <View style={styles.pujaIcon}>
                    <Ionicons name="flame" size={26} color={colors.saffron[600]} />
                  </View>
                  <Text style={styles.pujaName} numberOfLines={1}>{puja.name}</Text>
                  {puja.deity ? (
                    <Text style={styles.pujaDeity} numberOfLines={1}>{puja.deity}</Text>
                  ) : null}
                  <View style={styles.pujaFooter}>
                    <Text style={styles.pujaPrice}>
                      {puja.priceInr === null
                        ? 'Price on request'
                        : `₹${puja.priceInr.toLocaleString('en-IN')}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, hint, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; hint?: string; onPress: () => void; }) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...(hint ? { accessibilityHint: hint } : {})}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.saffron[700]} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PanchangItem({ label, value }: { label: string; value: string | undefined }) {
  return (
    <View style={styles.panchangItem}>
      <Text style={styles.panchangLabel}>{label}</Text>
      <Text style={styles.panchangValue} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  scrollContent: { paddingBottom: spacing['2xl'] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.stone[900] },
  dateText: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  bellButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.stone[200],
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.stone[200],
  },
  // PAR-22: `flex: 1` pushes the chevron to the trailing edge, so the row
  // reads as a navigation entry rather than as a text field.
  searchPlaceholder: { flex: 1, fontSize: fontSize.base, color: colors.stone[500] },
  waitlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.saffron[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  waitlistIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistText: { flex: 1 },
  waitlistTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  waitlistSubtitle: { fontSize: fontSize.xs, color: colors.stone[700], marginTop: 2 },
  panchangUnavailable: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    paddingVertical: spacing.sm,
  },
  sectionEmpty: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  panchangCard: {
    backgroundColor: colors.amber[400],
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    padding: spacing.md, borderRadius: borderRadius.lg,
  },
  panchangHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  panchangTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  panchangRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  panchangItem: { flex: 1 },
  panchangLabel: { fontSize: fontSize.xs, color: colors.stone[700], fontWeight: '600' },
  panchangValue: { fontSize: fontSize.sm, color: colors.stone[900], fontWeight: '700', marginTop: 2 },
  auspiciousWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  auspiciousBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start',
  },
  panchangCity: {
    fontSize: fontSize.xs, color: colors.stone[700], marginTop: spacing.xs,
  },
  auspiciousText: { fontSize: fontSize.xs, color: colors.stone[900], fontWeight: '700' },
  section: { marginTop: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.stone[900] },
  seeAll: { fontSize: fontSize.sm, color: colors.saffron[700], fontWeight: '700' },
  hScroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  darshanCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg, marginRight: spacing.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.stone[200],
  },
  darshanThumb: {
    height: 140, backgroundColor: colors.saffron[700],
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  liveBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.red[600], paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveBadgeText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '800' },
  darshanInfo: { padding: spacing.sm },
  darshanTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  darshanSub: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  viewersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  viewersText: { fontSize: fontSize.xs, color: colors.stone[500] },
  pujaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  // Width comes from gridWidthPercent(columns): '48%' at two columns, so
  // phones are byte-for-byte what they were, and 32%/24% on a tablet instead
  // of two tiles half a metre wide.
  pujaCard: {
    backgroundColor: colors.white,
    padding: spacing.md, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.stone[200],
  },
  pujaIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.saffron[100], alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pujaName: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  pujaDeity: { fontSize: fontSize.xs, color: colors.stone[600], marginTop: 2 },
  pujaFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm,
  },
  pujaPrice: { fontSize: fontSize.base, fontWeight: '800', color: colors.saffron[700] },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: fontSize.xs, color: colors.stone[700], fontWeight: '600' },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 64,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.saffron[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[800],
    fontWeight: '600',
  },
});
