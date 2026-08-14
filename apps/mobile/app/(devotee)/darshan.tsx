import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDarshan } from '@poojly/api-client';
import {
  selectLiveStreams,
  selectUpcomingDarshan,
  type LiveStreamVM,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

/**
 * PAR-07 / PAR-05. This tab read `darshanQuery.data?.data`, which does not
 * exist — GET /api/v1/darshan/live returns {streams,total,upcoming} — so it
 * always rendered eight hardcoded temples: four fake "LIVE" cards and four fake
 * "scheduled" ones, while the temple that was genuinely broadcasting was hidden.
 *
 * Both mock arrays are deleted. Live cards now come from `streams` and carry
 * the real playbackUrl straight to the player, so the player does not have to
 * re-resolve it (and cannot disagree with this list — see PAR-21, where
 * /:id/stream reports a different status and URL for the same stream).
 *
 * `upcoming` is a list of aarti SLOTS, not streams, and is rendered as such.
 */
function StreamCard({ stream }: { stream: LiveStreamVM }) {
  const isLive = stream.isLive;

  return (
    <TouchableOpacity
      style={[styles.streamCard, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
      onPress={() => {
        router.push({
          pathname: '/(devotee)/darshan-player' as never,
          params: {
            id: stream.id,
            title: stream.templeName,
            deity: stream.deity ?? '',
            ...(stream.playbackUrl ? { url: stream.playbackUrl } : {}),
          },
        } as never);
      }}
    >
      {/* Stream preview placeholder */}
      <View style={styles.streamPreview}>
        <Ionicons
          name="videocam"
          size={28}
          color={isLive ? colors.saffron[300] : colors.stone[300]}
        />

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            isLive ? styles.statusLive : styles.statusScheduled,
          ]}
        >
          {isLive && <View style={styles.livePulse} />}
          <Text style={styles.statusText}>
            {isLive ? 'LIVE' : 'SCHEDULED'}
          </Text>
        </View>

        {/* Viewer count for live — only when the server reports one */}
        {isLive && stream.viewerCount !== null && stream.viewerCount > 0 && (
          <View style={styles.viewerBadge}>
            <Ionicons name="people" size={10} color={colors.white} />
            <Text style={styles.viewerText}>
              {stream.viewerCount >= 1000
                ? `${(stream.viewerCount / 1000).toFixed(1)}K`
                : stream.viewerCount}
            </Text>
          </View>
        )}

        {/* Play button overlay */}
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons
              name={isLive ? 'play' : 'time'}
              size={20}
              color={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.streamInfo}>
        <Text style={styles.streamTempleName} numberOfLines={1}>
          {stream.templeName}
        </Text>
        {stream.city ? (
          <View style={styles.streamMetaRow}>
            <Ionicons name="location-outline" size={11} color={colors.stone[400]} />
            <Text style={styles.streamCity}>{stream.city}</Text>
          </View>
        ) : null}
        {stream.deity ? (
          <Text style={styles.streamDeity} numberOfLines={1}>
            {stream.deity}
          </Text>
        ) : null}
        {stream.currentSlot ? (
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={11} color={colors.saffron[500]} />
            <Text style={styles.scheduleTime}>{stream.currentSlot}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function DarshanScreen() {
  const darshanQuery = useDarshan();
  const [refreshing, setRefreshing] = useState(false);
  const liveData = selectLiveStreams(darshanQuery.data).filter((s) => s.isLive);
  const upcomingSlots = selectUpcomingDarshan(darshanQuery.data);

  const errorText = darshanQuery.isError
    ? darshanQuery.error instanceof Error
      ? darshanQuery.error.message
      : 'Unknown error'
    : null;

  async function onRefresh() {
    setRefreshing(true);
    await darshanQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Darshan</Text>
        <Text style={styles.headerSubtitle}>
          Watch sacred rituals from temples across India
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Live Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Now</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{liveData.length}</Text>
            </View>
          </View>

          {darshanQuery.isLoading && liveData.length === 0 ? (
            <Text style={styles.emptyNote}>Loading…</Text>
          ) : errorText ? (
            <Text style={styles.emptyNote}>
              Could not load live darshan: {errorText}. Pull down to retry.
            </Text>
          ) : liveData.length === 0 ? (
            <Text style={styles.emptyNote}>
              No temple is broadcasting right now. Upcoming aarti slots are
              listed below.
            </Text>
          ) : (
            <View style={styles.grid}>
              {liveData.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </View>
          )}
        </View>

        {/* Upcoming aarti slots — {templeSlug,nextSlot,startsInMin}, not streams */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.stone[500]} />
              <Text style={styles.sectionTitle}>Next aarti</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{upcomingSlots.length}</Text>
            </View>
          </View>

          {upcomingSlots.length === 0 ? (
            <Text style={styles.emptyNote}>
              {errorText ? 'Unavailable.' : 'No aarti slots published for today.'}
            </Text>
          ) : (
            upcomingSlots.map((slot) => (
              <TouchableOpacity
                key={`${slot.templeSlug}-${slot.nextSlot}`}
                style={styles.slotRow}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(devotee)/darshan-player' as never,
                    params: { id: slot.templeSlug, title: slot.templeSlug },
                  } as never)
                }
              >
                <Ionicons name="time-outline" size={16} color={colors.saffron[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotName}>{slot.nextSlot}</Text>
                  <Text style={styles.slotTemple}>{slot.templeSlug}</Text>
                </View>
                <Text style={styles.slotIn}>
                  in {slot.startsInMin} min
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reminder CTA */}
        <View style={styles.reminderCard}>
          <Ionicons name="notifications-outline" size={24} color={colors.saffron[600]} />
          <View style={styles.reminderContent}>
            <Text style={styles.reminderTitle}>Never miss a darshan</Text>
            <Text style={styles.reminderText}>
              Enable notifications to get alerts when your favorite temples go live.
            </Text>
          </View>
          <TouchableOpacity style={styles.reminderButton} activeOpacity={0.7} onPress={() => Alert.alert('Notifications Enabled', 'You will be notified before your favourite temples go live.')}>
            <Text style={styles.reminderButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyNote: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  slotName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[800] },
  slotTemple: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  slotIn: { fontSize: fontSize.xs, fontWeight: '700', color: colors.saffron[700] },
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
  scrollContent: {
    padding: GRID_PADDING,
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red[500],
  },
  countBadge: {
    backgroundColor: colors.saffron[100],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  // Stream Card
  streamCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  streamPreview: {
    height: 100,
    backgroundColor: colors.stone[100],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 3,
  },
  statusLive: {
    backgroundColor: colors.red[600],
  },
  statusScheduled: {
    backgroundColor: colors.stone[600],
  },
  livePulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.white,
  },
  statusText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  viewerBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  viewerText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '600',
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
  streamInfo: {
    padding: spacing.sm,
  },
  streamTempleName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 2,
  },
  streamMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  streamCity: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
  },
  streamDeity: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.saffron[600],
    marginBottom: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  scheduleTime: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.saffron[700],
  },
  // Reminder
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.saffron[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.saffron[100],
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 2,
  },
  reminderText: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 18,
  },
  reminderButton: {
    backgroundColor: colors.saffron[600],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  reminderButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
