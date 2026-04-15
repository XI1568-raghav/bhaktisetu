import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

interface DarshanStream {
  id: string;
  templeName: string;
  city: string;
  deity: string;
  status: 'live' | 'scheduled';
  viewers: number;
  scheduledTime?: string;
}

const liveStreams: DarshanStream[] = [
  {
    id: '1',
    templeName: 'Kashi Vishwanath',
    city: 'Varanasi',
    deity: 'Lord Shiva',
    status: 'live',
    viewers: 12450,
  },
  {
    id: '2',
    templeName: 'Tirumala Venkateswara',
    city: 'Tirupati',
    deity: 'Lord Venkateswara',
    status: 'live',
    viewers: 28300,
  },
  {
    id: '3',
    templeName: 'Siddhivinayak',
    city: 'Mumbai',
    deity: 'Lord Ganesha',
    status: 'live',
    viewers: 8760,
  },
  {
    id: '4',
    templeName: 'Somnath',
    city: 'Somnath',
    deity: 'Lord Shiva',
    status: 'live',
    viewers: 5420,
  },
];

const scheduledStreams: DarshanStream[] = [
  {
    id: '5',
    templeName: 'Jagannath Temple',
    city: 'Puri',
    deity: 'Lord Jagannath',
    status: 'scheduled',
    viewers: 0,
    scheduledTime: '06:00 PM',
  },
  {
    id: '6',
    templeName: 'Meenakshi Amman',
    city: 'Madurai',
    deity: 'Goddess Meenakshi',
    status: 'scheduled',
    viewers: 0,
    scheduledTime: '07:00 PM',
  },
  {
    id: '7',
    templeName: 'Kedarnath Temple',
    city: 'Kedarnath',
    deity: 'Lord Shiva',
    status: 'scheduled',
    viewers: 0,
    scheduledTime: '05:30 AM (Tomorrow)',
  },
  {
    id: '8',
    templeName: 'Dwarkadhish Temple',
    city: 'Dwarka',
    deity: 'Lord Krishna',
    status: 'scheduled',
    viewers: 0,
    scheduledTime: '06:30 AM (Tomorrow)',
  },
];

function StreamCard({ stream }: { stream: DarshanStream }) {
  const isLive = stream.status === 'live';

  return (
    <TouchableOpacity
      style={[styles.streamCard, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
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

        {/* Viewer count for live */}
        {isLive && stream.viewers > 0 && (
          <View style={styles.viewerBadge}>
            <Ionicons name="people" size={10} color={colors.white} />
            <Text style={styles.viewerText}>
              {stream.viewers >= 1000
                ? `${(stream.viewers / 1000).toFixed(1)}K`
                : stream.viewers}
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
        <View style={styles.streamMetaRow}>
          <Ionicons name="location-outline" size={11} color={colors.stone[400]} />
          <Text style={styles.streamCity}>{stream.city}</Text>
        </View>
        <Text style={styles.streamDeity} numberOfLines={1}>
          {stream.deity}
        </Text>
        {stream.scheduledTime && (
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={11} color={colors.saffron[500]} />
            <Text style={styles.scheduleTime}>{stream.scheduledTime}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DarshanScreen() {
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
      >
        {/* Live Now Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Now</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{liveStreams.length}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {liveStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </View>
        </View>

        {/* Upcoming Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.stone[500]} />
              <Text style={styles.sectionTitle}>Upcoming</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{scheduledStreams.length}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {scheduledStreams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </View>
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
          <TouchableOpacity style={styles.reminderButton} activeOpacity={0.7}>
            <Text style={styles.reminderButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
