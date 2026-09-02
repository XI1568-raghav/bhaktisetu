import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePujas } from '@poojly/api-client';
import { selectPujaTypes } from '../../lib/api-contracts';
import { PLATFORM_FEE_INR } from '../../lib/booking-flow';
import { verifiedNoun } from '../../lib/pandit-vetting';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type PujaCategory = 'all' | 'shiva' | 'vishnu' | 'devi' | 'ganesh' | 'navagraha';

/**
 * PAR-07. The catalogue on this screen was fiction.
 *
 * `pujasQuery.data?.data` does not exist — GET /api/v1/pujas/types returns
 * {pujaTypes,total,page,limit,totalPages} — so the screen fell through to a
 * six-row hardcoded array. Worse, even on the "API path" it did
 * `price: fb.price`, i.e. it took the NAME from the API and the PRICE from the
 * mock. Concrete divergences against the live catalogue:
 *
 *   Satyanarayan Katha       app ₹2,100   API/web ₹1,501
 *   Sunderkand Path          app ₹551     API/web ₹1,101
 *   Ganesh Atharvashirsha    app ₹751     does not exist (the puja is Ganesh Puja)
 *
 * A devotee tapped a price in the app and was charged a different one on the
 * web checkout. Price now comes from `basePrice` and nothing else.
 *
 * Also deleted: `rating`, `reviews`, `temple`, `city`. The puja-types endpoint
 * returns none of them, and inventing a 4.9 (1,240 reviews) badge on a ritual
 * is a fabricated social proof claim.
 *
 * PAR-15 (2), 2026-08-28 — NRI PRICE REMOVED, and the platform fee added.
 *
 * The card rendered `NRI: ₹{nriPriceInr}` on every row. No booking path
 * charges it: booking.service.ts:540 is `const pujaPrice = basePrice;`, and the
 * S3-09 comment above it states that NRI pricing only returns as a
 * server-QUOTED unit price rendered from the same value the gateway is asked
 * for. With this repo's own fixtures the card advertised ₹5,100 for a puja
 * that bills ₹1,151 — a 4.4x displayed-vs-charged gap aimed at the
 * highest-ARPU cohort in the catalogue.
 *
 * This was NOT an open product call, which is how it was last written up. The
 * web made the call on 2026-08-12 and deleted its own NRI line for exactly
 * this reason (apps/web/app/pujas/[slug]/page.tsx:353-363 — "advertises a
 * premium that is never collected"). Mobile was the surface nobody went back
 * to. Both lines return together when a server-quoted NRI amount exists.
 *
 * The same edit adds what the web card has and this one lacked: the ₹51
 * platform fee, so the number does not grow between the card and the Pay
 * button (CM-03).
 */
interface Puja {
  id: string;
  slug: string;
  name: string;
  deity?: string;
  category: Exclude<PujaCategory, 'all'>;
  priceInr: number | null;
  durationMinutes: number | null;
  description: string;
  samagriIncluded: boolean;
}

const categories: { key: PujaCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shiva', label: 'Shiva' },
  { key: 'vishnu', label: 'Vishnu' },
  { key: 'devi', label: 'Devi' },
  { key: 'ganesh', label: 'Ganesh' },
  { key: 'navagraha', label: 'Navagraha' },
];

function inferCategory(deity: string): Exclude<PujaCategory, 'all'> {
  const d = deity.toLowerCase();
  if (d.includes('shiva')) return 'shiva';
  if (d.includes('vishnu') || d.includes('ram') || d.includes('krishna') || d.includes('hanuman')) return 'vishnu';
  if (d.includes('devi') || d.includes('durga') || d.includes('lakshmi') || d.includes('saraswati')) return 'devi';
  if (d.includes('ganesh') || d.includes('ganesha')) return 'ganesh';
  if (d.includes('navagraha') || d.includes('graha')) return 'navagraha';
  return 'shiva';
}

/**
 * PAR-15. Booking now happens IN THE APP.
 *
 * This screen's only booking action used to be `Linking.openURL`, which ejected
 * the devotee into the mobile browser on darshya.online. An earlier pass made
 * that control honest about where it went ("Book on darshya.online", announced
 * to VoiceOver as a link); this one makes the trip unnecessary — both the card
 * and the button push /(devotee)/puja-book, which selects temple, day, slot and
 * sankalp names and creates the booking through POST /bookings/book.
 *
 * The card is a button again, and truthfully so: it stays in the app. Only the
 * card-payment step still opens the website, and that hand-off is declared on
 * the booking screen itself rather than here.
 *
 * NAV-01, 2026-09-02 — THE CARD NOW OPENS THE DETAIL PAGE, NOT THE FORM.
 *
 * app/(devotee)/puja-detail.tsx has existed and had ZERO inbound navigation:
 * `grep -rn "(devotee)/puja-detail" app lib` matched nothing but a stale
 * comment in lib/deep-link.ts, so the only way to reach it was a deep link.
 * Every fact a devotee might want before committing money — what the ritual
 * is, what samagri is included, which temples can actually take the booking —
 * lived on a screen the app never linked to, while the card jumped straight
 * into the booking form.
 *
 * So the two controls now do two different things, which is what having two
 * controls is for:
 *
 *   card body       -> (devotee)/puja-detail  { slug, name }   "tell me more"
 *   "Book this puja"-> (devotee)/puja-book    { slug, name }   "I already know"
 *
 * The fast path is deliberately preserved: puja-detail hands off to puja-book
 * with the SAME two params, so the button is a shortcut through the detail
 * page and not a second, divergent booking route. Booking logic is not
 * duplicated here or there — it lives only in puja-book.tsx.
 */
const PujaCard = React.memo(function PujaCard({ puja }: { puja: Puja }) {
  // Slug comes from the API row (PAR-07 replaced the hardcoded catalogue this
  // used to read), so the screen that opens books the puja that was tapped.
  const openBooking = () =>
    router.push({
      pathname: '/(devotee)/puja-book' as never,
      params: { slug: puja.slug, name: puja.name },
    } as never);
  const openDetail = () =>
    router.push({
      pathname: '/(devotee)/puja-detail' as never,
      params: { slug: puja.slug, name: puja.name },
    } as never);
  return (
    <TouchableOpacity
      style={styles.pujaCard}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={puja.name}
      accessibilityHint={`Opens details for ${puja.name}`}
      onPress={openDetail}
    >

      {/* Image placeholder */}
      <View style={styles.pujaImageArea}>
        <Ionicons name="flame" size={32} color={colors.saffron[300]} />
        <View style={styles.videoBadge}>
          <Ionicons name="videocam" size={10} color={colors.white} />
          <Text style={styles.videoBadgeText}>Video Proof</Text>
        </View>
      </View>

      <View style={styles.pujaContent}>
        <Text style={styles.pujaName} numberOfLines={1}>
          {puja.name}
        </Text>

        {puja.deity ? (
          <View style={styles.pujaDeityRow}>
            <Ionicons name="flower-outline" size={12} color={colors.saffron[500]} />
            <Text style={styles.pujaDeity}>{puja.deity}</Text>
          </View>
        ) : null}

        <Text style={styles.pujaDescription} numberOfLines={2}>
          {puja.description}
        </Text>

        <View style={styles.pujaFeatures}>
          {puja.durationMinutes !== null ? (
            <View style={styles.pujaFeatureBadge}>
              <Ionicons name="time-outline" size={10} color={colors.stone[500]} />
              <Text style={styles.pujaFeatureText}>
                {puja.durationMinutes} min
              </Text>
            </View>
          ) : null}
          {puja.samagriIncluded ? (
            <View style={styles.pujaFeatureBadge}>
              <Ionicons name="gift-outline" size={10} color={colors.green[600]} />
              <Text style={[styles.pujaFeatureText, { color: colors.green[600] }]}>
                Samagri included
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pujaFooter}>
          <View>
            <Text style={styles.pujaPrice}>
              {puja.priceInr === null
                ? 'Price on request'
                : `\u20B9${puja.priceInr.toLocaleString('en-IN')}`}
            </Text>
            {/* CM-03 on the catalogue. The fee travels with the price, so the
                number does not change between this card and the Pay button \u2014
                the API adds PLATFORM_FEE_INR to every booking
                (booking.service.ts), and the web card already discloses it
                (apps/web/app/pujas/[slug]/page.tsx:346-352).

                "from" is deliberate and not hedging: a temple may set a
                priceOverride, which is resolved on the booking screen once a
                temple is chosen, so this card can only state the floor. It
                understates and never overstates, which is the safe direction
                for a quote. */}
            {puja.priceInr === null ? null : (
              <Text style={styles.pujaFeeNote}>
                {'+ \u20B9'}
                {PLATFORM_FEE_INR.toLocaleString('en-IN')} platform fee \u00B7 from{' '}
                {'\u20B9'}
                {(puja.priceInr + PLATFORM_FEE_INR).toLocaleString('en-IN')} total
              </Text>
            )}
          </View>
          {/* NAV-01: the card is tappable and now goes somewhere other than
              the button beneath it, so it needs the affordance that says so.
              Decorative only — the row it sits in already carries the label
              and hint, and a second focusable node would make VoiceOver
              announce the same destination twice. */}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.stone[400]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Book ${puja.name}`}
          accessibilityHint="Choose a temple, day and time slot"
          onPress={openBooking}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.white} />
          <Text style={styles.bookButtonText}>Book this puja</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function PujasScreen() {
  const [activeCategory, setActiveCategory] = useState<PujaCategory>('all');
  const pujasQuery = usePujas();
  const [refreshing, setRefreshing] = useState(false);

  const sourceData: Puja[] = selectPujaTypes(pujasQuery.data).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    deity: p.deity,
    category: inferCategory(p.deity ?? ''),
    priceInr: p.priceInr,
    durationMinutes: p.durationMinutes,
    description: p.description ?? '',
    samagriIncluded: p.samagriIncluded,
  }));

  const filteredPujas =
    activeCategory === 'all'
      ? sourceData
      : sourceData.filter((p) => p.category === activeCategory);

  const errorText = pujasQuery.isError
    ? pujasQuery.error instanceof Error
      ? pujasQuery.error.message
      : 'Unknown error'
    : null;

  async function onRefresh() {
    setRefreshing(true);
    await pujasQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Book a Puja</Text>
            <Text style={styles.headerSubtitle}>
              {pujasQuery.isLoading
                ? 'Loading catalogue…'
                : errorText
                  ? 'Catalogue unavailable'
                  : /* TC-08: the adjective here used to be hardcoded. Nothing
                       promotes a Priest to verified — see lib/pandit-vetting.ts.
                       Video proof is the claim that IS backed, so it stays. */
                    `${sourceData.length} pujas · ${verifiedNoun('priests')}, video proof`}
            </Text>
          </View>
          {/* NAV-01. (devotee)/pandits.tsx — the directory of the people who
              actually perform these rituals — had ZERO inbound navigation.
              It is the supply side of the marketplace and it was reachable
              only by deep link. The catalogue is where a devotee is already
              thinking about who will perform the puja, so the entry belongs
              here as well as on the home screen. */}
          <TouchableOpacity
            style={styles.panditsButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Pandits"
            accessibilityHint="Opens the directory of pandits"
            onPress={() => router.push('/(devotee)/pandits' as never)}
          >
            <Ionicons name="people-outline" size={16} color={colors.saffron[700]} />
            <Text style={styles.panditsButtonText}>Pandits</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setActiveCategory(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Puja List */}
      <FlatList
        data={filteredPujas}
        keyExtractor={(item) => item.id}
        renderItem={useCallback(
          ({ item }: { item: Puja }) => <PujaCard puja={item} />,
          []
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={errorText ? 'cloud-offline-outline' : 'flame-outline'}
              size={48}
              color={colors.stone[300]}
            />
            <Text style={styles.emptyText}>
              {pujasQuery.isLoading
                ? 'Loading…'
                : errorText
                  ? 'Could not load the puja catalogue'
                  : 'No pujas in this category'}
            </Text>
            {errorText ? (
              <Text style={styles.emptySubtext}>{errorText} — pull down to retry.</Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.stone[900],
  },
  headerSubtitle: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: { flex: 1 },
  // NAV-01. 44pt minimum on both axes — the smallest reliable touch target,
  // and the one this repo's other pill controls are built to.
  panditsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.saffron[100],
    borderWidth: 1,
    borderColor: colors.saffron[200],
  },
  panditsButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  // Filter
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
  },
  filterChipActive: {
    backgroundColor: colors.saffron[600],
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[500],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  // List
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Puja Card
  pujaCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pujaImageArea: {
    height: 100,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  videoBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  pujaContent: {
    padding: spacing.md,
  },
  pujaName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.xs,
  },
  pujaDeityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  pujaDeity: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.saffron[600],
  },
  pujaTempleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  pujaTemple: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  pujaDescription: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  pujaFeatures: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pujaFeatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  pujaFeatureText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.stone[500],
  },
  pujaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  pujaPrice: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.saffron[700],
  },
  pujaFeeNote: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    marginTop: 1,
  },
  pujaRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pujaRatingText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[700],
  },
  pujaReviewCount: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[600],
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.stone[600],
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
