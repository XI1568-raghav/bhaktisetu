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
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type PujaCategory = 'all' | 'shiva' | 'vishnu' | 'devi' | 'ganesh' | 'navagraha';

interface Puja {
  id: string;
  slug: string;
  name: string;
  deity: string;
  category: Exclude<PujaCategory, 'all'>;
  temple: string;
  city: string;
  price: number;
  nriPrice: number;
  rating: number;
  reviews: number;
  duration: string;
  description: string;
  hasVideoProof: boolean;
  hasPrasadDelivery: boolean;
}

const categories: { key: PujaCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'shiva', label: 'Shiva' },
  { key: 'vishnu', label: 'Vishnu' },
  { key: 'devi', label: 'Devi' },
  { key: 'ganesh', label: 'Ganesh' },
  { key: 'navagraha', label: 'Navagraha' },
];

const pujasData: Puja[] = [
  {
    id: '1',
    slug: 'rudrabhishek',
    name: 'Rudrabhishek',
    deity: 'Lord Shiva',
    category: 'shiva',
    temple: 'Kashi Vishwanath',
    city: 'Varanasi',
    price: 1100,
    nriPrice: 9999,
    rating: 4.9,
    reviews: 2340,
    duration: '2-3 hours',
    description: 'Sacred abhishekam of Lord Shiva with holy water, milk, and bilva leaves.',
    hasVideoProof: true,
    hasPrasadDelivery: true,
  },
  {
    id: '2',
    slug: 'satyanarayan-katha',
    name: 'Satyanarayan Katha',
    deity: 'Lord Vishnu',
    category: 'vishnu',
    temple: 'Birla Mandir',
    city: 'Delhi',
    price: 2100,
    nriPrice: 19999,
    rating: 4.8,
    reviews: 1890,
    duration: '3-4 hours',
    description: 'Traditional katha and puja for blessings of prosperity and peace.',
    hasVideoProof: true,
    hasPrasadDelivery: true,
  },
  {
    id: '3',
    slug: 'ganesh-atharvashirsha',
    name: 'Ganesh Atharvashirsha',
    deity: 'Lord Ganesha',
    category: 'ganesh',
    temple: 'Siddhivinayak',
    city: 'Mumbai',
    price: 751,
    nriPrice: 6999,
    rating: 4.9,
    reviews: 3100,
    duration: '1-2 hours',
    description: 'Recitation of the powerful Atharvashirsha for removing obstacles.',
    hasVideoProof: true,
    hasPrasadDelivery: true,
  },
  {
    id: '4',
    slug: 'navagraha-shanti',
    name: 'Navagraha Shanti',
    deity: 'Nine Planets',
    category: 'navagraha',
    temple: 'Suryanar Kovil',
    city: 'Kumbakonam',
    price: 3100,
    nriPrice: 28999,
    rating: 4.7,
    reviews: 980,
    duration: '4-5 hours',
    description: 'Comprehensive puja to pacify all nine planets for harmony in life.',
    hasVideoProof: true,
    hasPrasadDelivery: false,
  },
  {
    id: '5',
    slug: 'durga-saptashati-path',
    name: 'Durga Saptashati Path',
    deity: 'Goddess Durga',
    category: 'devi',
    temple: 'Vaishno Devi',
    city: 'Katra',
    price: 1551,
    nriPrice: 14999,
    rating: 4.8,
    reviews: 1450,
    duration: '3-4 hours',
    description: 'Complete recitation of Durga Saptashati for divine protection.',
    hasVideoProof: true,
    hasPrasadDelivery: true,
  },
  {
    id: '6',
    slug: 'sunderkand-path',
    name: 'Sunderkand Path',
    deity: 'Lord Hanuman',
    category: 'vishnu',
    temple: 'Hanuman Garhi',
    city: 'Ayodhya',
    price: 551,
    nriPrice: 4999,
    rating: 4.7,
    reviews: 1540,
    duration: '2-3 hours',
    description: 'Recitation of Sunderkand from Ramcharitmanas for courage and devotion.',
    hasVideoProof: true,
    hasPrasadDelivery: true,
  },
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

const PujaCard = React.memo(function PujaCard({ puja }: { puja: Puja }) {
  const bookUrl = `https://darshya.online/pujas/book?slug=${encodeURIComponent(puja.slug)}&utm_source=mobile-app&utm_medium=puja-card`;
  return (
    <TouchableOpacity style={styles.pujaCard} activeOpacity={0.7} onPress={() => Linking.openURL(bookUrl)}>

      {/* Image placeholder */}
      <View style={styles.pujaImageArea}>
        <Ionicons name="flame" size={32} color={colors.saffron[300]} />
        {puja.hasVideoProof && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={10} color={colors.white} />
            <Text style={styles.videoBadgeText}>Video Proof</Text>
          </View>
        )}
      </View>

      <View style={styles.pujaContent}>
        <Text style={styles.pujaName} numberOfLines={1}>
          {puja.name}
        </Text>

        <View style={styles.pujaDeityRow}>
          <Ionicons name="flower-outline" size={12} color={colors.saffron[500]} />
          <Text style={styles.pujaDeity}>{puja.deity}</Text>
        </View>

        <View style={styles.pujaTempleRow}>
          <Ionicons name="location-outline" size={12} color={colors.stone[400]} />
          <Text style={styles.pujaTemple}>
            {puja.temple}, {puja.city}
          </Text>
        </View>

        <Text style={styles.pujaDescription} numberOfLines={2}>
          {puja.description}
        </Text>

        <View style={styles.pujaFeatures}>
          <View style={styles.pujaFeatureBadge}>
            <Ionicons name="time-outline" size={10} color={colors.stone[500]} />
            <Text style={styles.pujaFeatureText}>{puja.duration}</Text>
          </View>
          {puja.hasPrasadDelivery && (
            <View style={styles.pujaFeatureBadge}>
              <Ionicons name="gift-outline" size={10} color={colors.green[600]} />
              <Text style={[styles.pujaFeatureText, { color: colors.green[600] }]}>
                Prasad
              </Text>
            </View>
          )}
        </View>

        <View style={styles.pujaFooter}>
          <View>
            <Text style={styles.pujaPrice}>
              {'\u20B9'}{puja.price.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.pujaNriPrice}>
              NRI: ${Math.round(puja.nriPrice / 83)}
            </Text>
          </View>
          <View style={styles.pujaRatingRow}>
            <Ionicons name="star" size={13} color={colors.amber[500]} />
            <Text style={styles.pujaRatingText}>{puja.rating}</Text>
            <Text style={styles.pujaReviewCount}>
              ({puja.reviews.toLocaleString('en-IN')})
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bookButton} activeOpacity={0.7} onPress={() => Linking.openURL(bookUrl)}>
          <Ionicons name="calendar-outline" size={16} color={colors.white} />
          <Text style={styles.bookButtonText}>Book Puja</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function PujasScreen() {
  const [activeCategory, setActiveCategory] = useState<PujaCategory>('all');
  const pujasQuery = usePujas();
  const [refreshing, setRefreshing] = useState(false);

  // Merge API pujas (names/deities) with fallback prices/ratings.
  const apiPujas = pujasQuery.data?.data ?? [];
  const sourceData: Puja[] = apiPujas.length > 0
    ? apiPujas.map((p, i) => {
        const fb = pujasData[i % pujasData.length]!;
        const cat = inferCategory(p.deity);
        return {
          id: p.id,
          slug: (p as { slug?: string }).slug ?? p.id,
          name: p.name,
          deity: p.deity,
          category: cat,
          temple: fb.temple,
          city: fb.city,
          price: fb.price,
          nriPrice: fb.nriPrice,
          rating: fb.rating,
          reviews: fb.reviews,
          duration: `${Math.round((p.durationMinutes ?? 120) / 60)}-${Math.round((p.durationMinutes ?? 120) / 60) + 1} hours`,
          description: p.shortDescription ?? p.description ?? '',
          hasVideoProof: true,
          hasPrasadDelivery: true,
        };
      })
    : pujasData;

  const filteredPujas =
    activeCategory === 'all'
      ? sourceData
      : sourceData.filter((p) => p.category === activeCategory);

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
          Verified priests, video proof, prasad delivery
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
            <Ionicons name="flame-outline" size={48} color={colors.stone[300]} />
            <Text style={styles.emptyText}>No pujas in this category</Text>
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
});
