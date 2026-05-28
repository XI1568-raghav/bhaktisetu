import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTemples } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Temple {
  id: string;
  name: string;
  city: string;
  state: string;
  deity: string;
  tradition: string;
  trustScore: number;
  liveDarshanEnabled: boolean;
  viewers: number;
  isVerified: boolean;
  description: string;
}

const templesData: Temple[] = [
  {
    id: '1',
    name: 'Shri Kashi Vishwanath Temple',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    deity: 'Lord Shiva',
    tradition: 'Shaiva',
    trustScore: 98,
    liveDarshanEnabled: true,
    viewers: 12450,
    isVerified: true,
    description: 'One of the 12 Jyotirlingas, dedicated to Lord Shiva on the banks of the Ganga.',
  },
  {
    id: '2',
    name: 'Tirumala Venkateswara Temple',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    deity: 'Lord Venkateswara',
    tradition: 'Vaishnava',
    trustScore: 99,
    liveDarshanEnabled: true,
    viewers: 28300,
    isVerified: true,
    description: 'The richest and most visited temple in the world, dedicated to Lord Venkateswara.',
  },
  {
    id: '3',
    name: 'Shree Siddhivinayak Temple',
    city: 'Mumbai',
    state: 'Maharashtra',
    deity: 'Lord Ganesha',
    tradition: 'Smarta',
    trustScore: 96,
    liveDarshanEnabled: true,
    viewers: 8760,
    isVerified: true,
    description: "Mumbai's most revered temple, the deity is called Navasacha Ganpati.",
  },
  {
    id: '4',
    name: 'Somnath Temple',
    city: 'Somnath',
    state: 'Gujarat',
    deity: 'Lord Shiva',
    tradition: 'Shaiva',
    trustScore: 97,
    liveDarshanEnabled: true,
    viewers: 5420,
    isVerified: true,
    description: 'First among the twelve Jyotirlinga shrines at the confluence of three rivers.',
  },
  {
    id: '5',
    name: 'Shri Jagannath Temple',
    city: 'Puri',
    state: 'Odisha',
    deity: 'Lord Jagannath',
    tradition: 'Vaishnava',
    trustScore: 98,
    liveDarshanEnabled: false,
    viewers: 0,
    isVerified: true,
    description: 'One of the Char Dham, famous for the annual Rath Yatra and Mahaprasad.',
  },
];

function renderStars(trustScore: number) {
  const rating = trustScore / 20;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color={colors.amber[500]} />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <Ionicons key={i} name="star-half" size={14} color={colors.amber[500]} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={14} color={colors.stone[300]} />
      );
    }
  }
  return stars;
}

function TempleCard({ temple }: { temple: Temple }) {
  const detailUrl = `https://darshya.online/temples/${encodeURIComponent(temple.id)}?utm_source=mobile-app&utm_medium=temple-card`;
  const openTemple = () => {
    if (temple.liveDarshanEnabled) {
      router.push({ pathname: '/(devotee)/darshan-player' as any, params: { id: temple.id, title: temple.name } } as any);
    } else {
      Linking.openURL(detailUrl);
    }
  };
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={openTemple}>
      {/* Image placeholder */}
      <View style={styles.cardImage}>
        <Ionicons name="business" size={36} color={colors.saffron[300]} />
        {temple.liveDarshanEnabled && (
          <View style={styles.liveBadge}>
            <View style={styles.livePulse} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
        {temple.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={12} color={colors.white} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardContent}>
        <Text style={styles.templeName} numberOfLines={1}>
          {temple.name}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.stone[400]} />
          <Text style={styles.locationText}>
            {temple.city}, {temple.state}
          </Text>
        </View>

        <View style={styles.deityRow}>
          <Ionicons name="flower-outline" size={14} color={colors.saffron[500]} />
          <Text style={styles.deityText}>{temple.deity}</Text>
          <Text style={styles.traditionText}>{temple.tradition}</Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {temple.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>{renderStars(temple.trustScore)}</View>
            <Text style={styles.ratingValue}>
              {(temple.trustScore / 20).toFixed(1)}
            </Text>
          </View>
          {temple.liveDarshanEnabled && temple.viewers > 0 && (
            <View style={styles.viewersRow}>
              <Ionicons name="eye-outline" size={13} color={colors.stone[400]} />
              <Text style={styles.viewersText}>
                {temple.viewers.toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.viewButton} activeOpacity={0.7} onPress={openTemple}>
          <Text style={styles.viewButtonText}>{temple.liveDarshanEnabled ? 'Watch Live' : 'View Temple'}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function TemplesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const templesQuery = useTemples();
  const [refreshing, setRefreshing] = useState(false);

  // Map API temples (real data) to local UI shape, fall back to mock if empty
  const apiTemples = templesQuery.data?.data ?? [];
  const sourceTemples: Temple[] = apiTemples.length > 0
    ? apiTemples.map((t, i) => {
        const fb = templesData[i % templesData.length]!;
        return {
          id: t.id,
          name: t.name,
          city: t.city,
          state: t.state,
          deity: t.deity,
          tradition: String(t.tradition),
          trustScore: Math.round((t.rating ?? 4.5) * 20),
          liveDarshanEnabled: t.liveDarshanAvailable ?? fb.liveDarshanEnabled,
          viewers: fb.viewers,
          isVerified: t.isVerified ?? true,
          description: t.shortDescription ?? t.description ?? fb.description,
        };
      })
    : templesData;

  const filteredTemples = sourceTemples.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.deity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function onRefresh() {
    setRefreshing(true);
    await templesQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sacred Temples</Text>
        <Text style={styles.headerSubtitle}>
          {sourceTemples.length} verified temples
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.stone[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, city, or deity..."
            placeholderTextColor={colors.stone[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.stone[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Temple List */}
      <FlatList
        data={filteredTemples}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TempleCard temple={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.stone[300]} />
            <Text style={styles.emptyText}>No temples found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
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
  // Search
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone[50],
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.stone[800],
    padding: 0,
  },
  // List
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Card
  card: {
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
  cardImage: {
    height: 120,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  liveBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.green[600],
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: spacing.md,
  },
  templeName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  deityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  deityText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.saffron[600],
  },
  traditionText: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
    marginLeft: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.stone[700],
  },
  viewersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewersText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[600],
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  viewButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  // Empty state
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
    fontSize: fontSize.base,
    color: colors.stone[400],
  },
});
