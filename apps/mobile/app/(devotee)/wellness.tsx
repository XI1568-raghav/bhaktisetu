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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWellnessSessions } from '@poojly/api-client';
import { selectWellnessSessions, type WellnessSessionVM } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

type WellnessTab = 'yoga' | 'meditation' | 'ayurveda';

interface YogaSession {
  id: string;
  title: string;
  /** The list payload carries instructorId only, never a name. */
  category: string;
  duration: string;
  seats: string | null;
  price: string | null;
  when: string | null;
  isLive: boolean;
}

interface MeditationTrack {
  id: string;
  title: string;
  guide: string;
  duration: string;
  category: string;
  plays: number;
}

interface AyurvedaTip {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}

/**
 * PAR-10 (devotee side). `sessionsQuery.data?.sessions` is undefined —
 * GET /api/v1/wellness/sessions answers {data:[…]} — so this tab always fell
 * through to four hardcoded classes: "Surya Namaskar Flow with Guru Priya,
 * 340 practising now" and three more. None of them existed, none could be
 * booked, and their instructors are not people who teach on Darshya. Even on
 * the API path the screen took `participants` from that mock, stamping a real
 * class with an invented live audience.
 *
 * The mock is deleted rather than repaired. Sessions now come from
 * selectWellnessSessions and an empty catalogue renders as empty.
 */

const meditationTracks: MeditationTrack[] = [
  {
    id: '1',
    title: 'Om Meditation (Deep Focus)',
    guide: 'Swami Vivekanand',
    duration: '15 min',
    category: 'Focus',
    plays: 12400,
  },
  {
    id: '2',
    title: 'Chakra Healing Meditation',
    guide: 'Guru Maya',
    duration: '30 min',
    category: 'Healing',
    plays: 8900,
  },
  {
    id: '3',
    title: 'Sleep & Relaxation',
    guide: 'Guru Maya',
    duration: '45 min',
    category: 'Sleep',
    plays: 23100,
  },
  {
    id: '4',
    title: 'Morning Gratitude Practice',
    guide: 'Swami Vivekanand',
    duration: '10 min',
    category: 'Morning',
    plays: 15600,
  },
  {
    id: '5',
    title: 'Vipassana Body Scan',
    guide: 'Guru Anand',
    duration: '20 min',
    category: 'Mindfulness',
    plays: 9800,
  },
];

const ayurvedaTips: AyurvedaTip[] = [
  {
    id: '1',
    title: 'Morning Routine (Dinacharya)',
    description: 'Start your day with warm water, oil pulling, and tongue scraping for optimal digestion.',
    category: 'Daily Routine',
    icon: 'sunny',
  },
  {
    id: '2',
    title: 'Seasonal Eating (Ritucharya)',
    description: 'Eat warm, nourishing foods in winter and cooling foods in summer to maintain dosha balance.',
    category: 'Diet',
    icon: 'leaf',
  },
  {
    id: '3',
    title: 'Abhyanga Self-Massage',
    description: 'Daily self-massage with warm sesame oil improves circulation and calms the nervous system.',
    category: 'Body Care',
    icon: 'hand-left',
  },
  {
    id: '4',
    title: 'Herbal Remedies',
    description: 'Ashwagandha for stress, Tulsi for immunity, Brahmi for memory and cognitive health.',
    category: 'Herbs',
    icon: 'flask',
  },
];

const tabConfig: { key: WellnessTab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'yoga', label: 'Yoga', icon: 'body' },
  { key: 'meditation', label: 'Meditation', icon: 'moon' },
  { key: 'ayurveda', label: 'Ayurveda', icon: 'leaf' },
];

function YogaContent({
  sessions,
  refreshing,
  onRefresh,
}: {
  sessions: YogaSession[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* The "Daily Yoga Challenge — Day 12 of 21, 12/21 days completed, 57%"
          card stood here. It was a literal: no streak endpoint, no per-user
          progress, the same day-12 for every devotee on first launch. Invented
          personal progress belongs in the same bin as the invented classes
          below it. */}

      {/* Sessions */}
      <Text style={styles.contentSectionTitle}>Sessions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {sessions.length === 0 ? (
          <Text style={styles.sessionsEmpty}>
            No wellness classes are scheduled right now.
          </Text>
        ) : (
          sessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, { width: CARD_WIDTH }]}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  session.title,
                  [
                    session.when ? `When: ${session.when}` : null,
                    `Duration: ${session.duration}`,
                    session.seats ? `Capacity: ${session.seats}` : null,
                    session.price ? `Price: ${session.price}` : null,
                    '\nBooking a class is not available in the app yet.',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                )
              }
            >
              <View style={styles.sessionImageArea}>
                <Ionicons name="body" size={28} color={colors.saffron[300]} />
                {session.isLive && (
                  <View style={styles.liveBadge}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle} numberOfLines={1}>
                  {session.title}
                </Text>
                <Text style={styles.sessionCategory}>{session.category}</Text>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionInstructor}>{session.when ?? ''}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="time-outline" size={10} color={colors.stone[400]} />
                    <Text style={styles.sessionDuration}>{session.duration}</Text>
                  </View>
                </View>
                {session.price || session.seats ? (
                  <View style={styles.participantsRow}>
                    <Ionicons name="pricetag" size={11} color={colors.saffron[500]} />
                    <Text style={styles.participantsText}>
                      {[session.price, session.seats].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScrollView>
  );
}

function MeditationContent({ playingId, setPlayingId }: { playingId: string | null; setPlayingId: (id: string | null) => void }) {

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
    >
      {/* Quick Start */}
      <View style={styles.quickStartCard}>
        <Text style={styles.quickStartTitle}>Quick Meditation</Text>
        <View style={styles.quickStartRow}>
          {['5 min', '10 min', '15 min', '20 min'].map((d) => (
            <TouchableOpacity key={d} style={styles.quickStartButton} activeOpacity={0.7} onPress={() => Alert.alert('Meditation Started', `Starting ${d} meditation session. Find a quiet place and breathe deeply.`)}>
              <Ionicons name="play" size={14} color={colors.saffron[600]} />
              <Text style={styles.quickStartButtonText}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tracks */}
      <Text style={styles.contentSectionTitle}>Guided Sessions</Text>
      {meditationTracks.map((track) => {
        const isPlaying = playingId === track.id;
        return (
          <TouchableOpacity
            key={track.id}
            style={[styles.trackRow, isPlaying && styles.trackRowActive]}
            activeOpacity={0.7}
            onPress={() => setPlayingId(isPlaying ? null : track.id)}
          >
            <View
              style={[
                styles.trackIcon,
                { backgroundColor: isPlaying ? colors.saffron[600] : colors.stone[100] },
              ]}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'moon'}
                size={18}
                color={isPlaying ? colors.white : colors.saffron[500]}
              />
            </View>
            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, isPlaying && styles.trackTitleActive]} numberOfLines={1}>
                {track.title}
              </Text>
              <View style={styles.trackMeta}>
                <Text style={styles.trackGuide}>{track.guide}</Text>
                <Text style={styles.trackDot}>{' \u2022 '}</Text>
                <Text style={styles.trackDuration}>{track.duration}</Text>
              </View>
            </View>
            <View style={styles.trackRight}>
              <View style={styles.trackCategoryBadge}>
                <Text style={styles.trackCategoryText}>{track.category}</Text>
              </View>
              <Text style={styles.trackPlays}>
                {track.plays >= 1000
                  ? `${(track.plays / 1000).toFixed(1)}K plays`
                  : `${track.plays} plays`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function AyurvedaContent() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
    >
      {/* Dosha Quiz CTA */}
      <View style={styles.doshaCard}>
        <Text style={styles.doshaTitle}>Discover Your Dosha</Text>
        <Text style={styles.doshaSubtext}>
          Take a quick quiz to understand your Ayurvedic body type (Vata, Pitta, or Kapha).
        </Text>
        <TouchableOpacity style={styles.doshaButton} activeOpacity={0.7} onPress={() => Alert.alert('Dosha Quiz', 'Discover your Ayurvedic constitution. Quiz coming soon!')}>
          <Ionicons name="clipboard-outline" size={16} color={colors.white} />
          <Text style={styles.doshaButtonText}>Take the Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <Text style={styles.contentSectionTitle}>Ayurveda Wisdom</Text>
      {ayurvedaTips.map((tip) => (
        <TouchableOpacity key={tip.id} style={styles.tipCard} activeOpacity={0.7} onPress={() => Alert.alert(tip.title, tip.description)}>
          <View style={styles.tipIconContainer}>
            <Ionicons name={tip.icon} size={22} color={colors.green[600]} />
          </View>
          <View style={styles.tipInfo}>
            <View style={styles.tipCategoryBadge}>
              <Text style={styles.tipCategoryText}>{tip.category}</Text>
            </View>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipDescription} numberOfLines={2}>
              {tip.description}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/**
 * The payload has no `level` column, so the level badge (and the
 * mapWellnessLevel helper that fed it) is gone rather than defaulted to
 * "Beginner" for every class.
 */
function toYogaSession(s: WellnessSessionVM): YogaSession {
  const startsAt = s.scheduledAt ? new Date(s.scheduledAt) : null;
  const started = startsAt !== null && startsAt.getTime() <= Date.now();
  return {
    id: s.id,
    title: s.title,
    category: s.type ?? 'Wellness',
    duration: s.durationMinutes !== null ? `${s.durationMinutes} min` : '—',
    seats: s.capacity !== null ? `${s.capacity} seats` : null,
    price:
      s.priceInr === null ? null : s.priceInr === 0 ? 'Free' : `₹${s.priceInr.toLocaleString('en-IN')}`,
    when: startsAt
      ? startsAt.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null,
    isLive: started && s.status === 'LIVE',
  };
}

export default function WellnessScreen() {
  const [activeTab, setActiveTab] = useState<WellnessTab>('yoga');
  const [meditationPlayingId, setMeditationPlayingId] = useState<string | null>(null);
  const sessionsQuery = useWellnessSessions();
  const [refreshing, setRefreshing] = useState(false);

  const sourceSessions: YogaSession[] = selectWellnessSessions(sessionsQuery.data).map(
    toYogaSession,
  );

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wellness</Text>
        <Text style={styles.headerSubtitle}>
          Yoga, meditation, and Ayurveda
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <View style={styles.tabControl}>
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? colors.white : colors.stone[500]}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'yoga' && <YogaContent sessions={sourceSessions} refreshing={refreshing} onRefresh={onRefresh} />}
      {activeTab === 'meditation' && <MeditationContent playingId={meditationPlayingId} setPlayingId={setMeditationPlayingId} />}
      {activeTab === 'ayurveda' && <AyurvedaContent />}
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
  // Tabs
  tabContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  tabControl: {
    flexDirection: 'row',
    backgroundColor: colors.stone[100],
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: colors.saffron[600],
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[500],
  },
  tabTextActive: {
    color: colors.white,
  },
  // Tab Content
  tabContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  contentSectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  horizontalScroll: {
    gap: spacing.sm,
  },
  sessionsEmpty: {
    fontSize: fontSize.base,
    color: colors.stone[500],
    paddingVertical: spacing.md,
  },
  // Yoga Challenge
  challengeCard: {
    flexDirection: 'row',
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  challengeLeft: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  challengeSubtext: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  challengeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  // Session Card
  sessionCard: {
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
  sessionImageArea: {
    height: 110,
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
  levelBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  levelText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  sessionInfo: {
    padding: spacing.sm,
  },
  sessionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 2,
  },
  sessionCategory: {
    fontSize: fontSize.xs,
    color: colors.saffron[600],
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionInstructor: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
  },
  sessionDuration: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  participantsText: {
    fontSize: fontSize.xs,
    color: colors.saffron[500],
    fontWeight: '500',
  },
  // Meditation
  quickStartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  quickStartTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  quickStartRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    borderWidth: 1,
    borderColor: colors.saffron[100],
  },
  quickStartButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.saffron[700],
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  trackRowActive: {
    borderColor: colors.saffron[200],
    backgroundColor: colors.saffron[50],
  },
  trackIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[900],
    marginBottom: 2,
  },
  trackTitleActive: {
    color: colors.saffron[700],
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackGuide: {
    fontSize: fontSize.xs,
    color: colors.stone[500],
  },
  trackDot: {
    fontSize: fontSize.xs,
    color: colors.stone[300],
  },
  trackDuration: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  trackRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trackCategoryBadge: {
    backgroundColor: colors.saffron[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trackCategoryText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.saffron[600],
  },
  trackPlays: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  // Ayurveda
  doshaCard: {
    backgroundColor: colors.green[600],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  doshaTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  doshaSubtext: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  doshaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  doshaButtonText: {
    color: colors.green[600],
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.green[500] + '14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipInfo: {
    flex: 1,
  },
  tipCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green[500] + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  tipCategoryText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.green[600],
  },
  tipTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 3,
  },
  tipDescription: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
  },
});
