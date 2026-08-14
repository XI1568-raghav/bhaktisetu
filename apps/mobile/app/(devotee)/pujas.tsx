import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePujas } from '@poojly/api-client';
import { selectPujaTypes } from '../../lib/api-contracts';
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
 * web checkout. Price now comes from `basePrice` / `nriPrice` and nothing else.
 *
 * Also deleted: `rating`, `reviews`, `temple`, `city`. The puja-types endpoint
 * returns none of them, and inventing a 4.9 (1,240 reviews) badge on a ritual
 * is a fabricated social proof claim.
 */
interface Puja {
  id: string;
  slug: string;
  name: string;
  deity?: string;
  category: Exclude<PujaCategory, 'all'>;
  priceInr: number | null;
  nriPriceInr: number | null;
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
 * PAR-15. There is no in-app booking flow: this screen's only booking action is
 * `Linking.openURL`, which ejects the devotee into the mobile browser. Building
 * the flow is separate work (the dead `useCreateBooking` hook it would use is
 * fixed in packages/api-client), but the control must not keep claiming to be
 * something it is not — a saffron primary button reading "Book Puja" with a
 * calendar icon is the strongest possible signal that the booking happens here.
 * It says where it goes now, and announces itself to VoiceOver/TalkBack as a
 * link rather than a plain button.
 */
const PujaCard = React.memo(function PujaCard({ puja }: { puja: Puja }) {
  // Slug comes from the API row (PAR-07 replaced the hardcoded catalogue this
  // used to read), so the page that opens is the puja that was tapped.
  const bookUrl = `https://darshya.online/pujas/book?slug=${encodeURIComponent(puja.slug)}&utm_source=mobile-app&utm_medium=puja-card`;
  const leavesAppHint = `Opens darshya.online in your browser to book ${puja.name}`;
  return (
    <TouchableOpacity
      style={styles.pujaCard}
      activeOpacity={0.7}
      accessibilityRole="link"
      accessibilityLabel={puja.name}
      accessibilityHint={leavesAppHint}
      onPress={() => Linking.openURL(bookUrl)}
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
            {puja.nriPriceInr !== null ? (
              <Text style={styles.pujaNriPrice}>
                NRI: {'\u20B9'}
                {puja.nriPriceInr.toLocaleString('en-IN')}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel={`Book ${puja.name} on darshya.online`}
          accessibilityHint={leavesAppHint}
          onPress={() => Linking.openURL(bookUrl)}
        >
          <Ionicons name="open-outline" size={16} color={colors.white} />
          <Text style={styles.bookButtonText}>Book on darshya.online</Text>
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
    nriPriceInr: p.nriPriceInr,
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
        <Text style={styles.headerTitle}>Book a Puja</Text>
        <Text style={styles.headerSubtitle}>
          {pujasQuery.isLoading
            ? 'Loading catalogue…'
            : errorText
              ? 'Catalogue unavailable'
              : `${sourceData.length} pujas · verified priests, video proof`}
        </Text>
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
  pujaNriPrice: {
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
