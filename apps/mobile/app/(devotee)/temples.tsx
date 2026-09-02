import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTemples } from '@poojly/api-client';
import { selectTemples, selectTotal, type TempleVM } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-07. This screen read `templesQuery.data?.data`, which does not exist —
 * GET /api/v1/temples returns {temples,total,page,limit,totalPages} — so it
 * always fell through to a hardcoded five-temple array and the header claimed
 * "5 verified temples" while the catalogue holds 20.
 *
 * Deleted with the mock: `trustScore` (a star rating computed from an invented
 * 0-100 score) and `viewers` (a made-up live viewer count). The temples
 * endpoint returns neither, so neither is rendered any more. An invented
 * five-star rating on a temple listing is not a placeholder, it is a claim.
 *
 * PAR-17 falls out of the same fix: the card deep-linked with `temple.id`, but
 * the web route is /temples/[slug], so every link 404'd. It uses `slug` now.
 *
 * THE CARD NO LONGER LEAVES THE APP
 * ---------------------------------
 * It used to branch: a streaming temple opened the darshan player, and every
 * other temple called
 *
 *     Linking.openURL('https://darshya.online/temples/<slug>?utm_source=…')
 *
 * which EXITS to Chrome or Safari, drops the app's back stack, and lands the
 * devotee on a site that cannot see the expo-secure-store session — on the
 * catalogue that is the supply anchor of the entire product. The reason it did
 * that was simply that the app had no temple screen. It has one now
 * ((devotee)/temple-detail.tsx, reading the same GET /temples/:slug the website
 * reads), so the card pushes to it and the bounce-out is deleted rather than
 * merely relabelled.
 *
 * The LIVE card also goes to the detail screen rather than straight into the
 * player: the detail carries the darshan stream row, and jumping past it meant
 * the player was the only way a streaming temple could ever be read about. The
 * detail's first action is "Live darshan", one tap further on.
 */

const TempleCard = React.memo(function TempleCard({ temple }: { temple: TempleVM }) {
  const openTemple = () => {
    router.push({
      pathname: '/(devotee)/temple-detail' as never,
      params: { slug: temple.slug, name: temple.name },
    } as never);
  };
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${temple.name}, view temple`}
      onPress={openTemple}
    >
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

        {temple.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.stone[400]} />
            <Text style={styles.locationText}>{temple.location}</Text>
          </View>
        ) : null}

        {temple.deity ? (
          <View style={styles.deityRow}>
            <Ionicons name="flower-outline" size={14} color={colors.saffron[500]} />
            <Text style={styles.deityText}>{temple.deity}</Text>
          </View>
        ) : null}

        {temple.nameLocal ? (
          <Text style={styles.description} numberOfLines={1}>
            {temple.nameLocal}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.viewButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${temple.name}`}
          onPress={openTemple}
        >
          <Text style={styles.viewButtonText}>View Temple</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function TemplesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const templesQuery = useTemples();
  const [refreshing, setRefreshing] = useState(false);

  const sourceTemples = selectTemples(templesQuery.data);
  const total = selectTotal(templesQuery.data, sourceTemples.length);

  const q = searchQuery.trim().toLowerCase();
  const filteredTemples = q
    ? sourceTemples.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.city ?? '').toLowerCase().includes(q) ||
          (t.deity ?? '').toLowerCase().includes(q),
      )
    : sourceTemples;

  const errorText = templesQuery.isError
    ? templesQuery.error instanceof Error
      ? templesQuery.error.message
      : 'Unknown error'
    : null;

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
          {templesQuery.isLoading
            ? 'Loading temples…'
            : errorText
              ? 'Temples unavailable'
              : `${total} temples`}
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
        renderItem={useCallback(
          ({ item }: { item: TempleVM }) => <TempleCard temple={item} />,
          []
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={errorText ? 'cloud-offline-outline' : 'search-outline'}
              size={48}
              color={colors.stone[300]}
            />
            <Text style={styles.emptyText}>
              {templesQuery.isLoading
                ? 'Loading…'
                : errorText
                  ? 'Could not load temples'
                  : 'No temples found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {errorText
                ? `${errorText} — pull down to retry.`
                : q
                  ? 'Try a different search term'
                  : 'The temple catalogue is empty right now.'}
            </Text>
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
    // >= 44pt: the minimum comfortable touch target on both platforms. The
    // old `paddingVertical: 10` produced a ~37pt control.
    minHeight: 44,
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
