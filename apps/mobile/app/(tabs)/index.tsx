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
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

// --- Static Data ---

const liveDarshanData = [
  {
    id: '1',
    templeName: 'Shri Kashi Vishwanath',
    city: 'Varanasi',
    deity: 'Lord Shiva',
    viewers: 12450,
    isLive: true,
  },
  {
    id: '2',
    templeName: 'Tirumala Venkateswara',
    city: 'Tirupati',
    deity: 'Lord Venkateswara',
    viewers: 28300,
    isLive: true,
  },
  {
    id: '3',
    templeName: 'Shree Siddhivinayak',
    city: 'Mumbai',
    deity: 'Lord Ganesha',
    viewers: 8760,
    isLive: true,
  },
];

const popularPujas = [
  {
    id: '1',
    name: 'Rudrabhishek',
    deity: 'Lord Shiva',
    price: 1100,
    rating: 4.9,
    reviews: 2340,
  },
  {
    id: '2',
    name: 'Satyanarayan Katha',
    deity: 'Lord Vishnu',
    price: 2100,
    rating: 4.8,
    reviews: 1890,
  },
  {
    id: '3',
    name: 'Ganesh Atharvashirsha',
    deity: 'Lord Ganesha',
    price: 751,
    rating: 4.9,
    reviews: 3100,
  },
  {
    id: '4',
    name: 'Sunderkand Path',
    deity: 'Lord Hanuman',
    price: 551,
    rating: 4.7,
    reviews: 1540,
  },
];

const panchangData = {
  tithi: 'Dwadashi (Shukla Paksha)',
  nakshatra: 'Uttara Phalguni',
  sunrise: '06:02 AM',
  sunset: '06:41 PM',
  rahuKaal: '07:30 AM - 09:00 AM',
  auspicious: 'Sarvartha Siddhi Yoga',
};

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.omSymbol}>{'ॐ'}</Text>
            <View>
              <Text style={styles.namaste}>Namaste</Text>
              <Text style={styles.welcomeText}>Welcome to Poojly</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color={colors.stone[700]} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={colors.stone[400]} />
          <Text style={styles.searchPlaceholder}>
            Search temples, pujas, content...
          </Text>
        </TouchableOpacity>

        {/* Live Darshan Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live Darshan</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {liveDarshanData.map((item) => (
              <TouchableOpacity key={item.id} style={styles.darshanCard} activeOpacity={0.8}>
                <View style={styles.darshanImagePlaceholder}>
                  <Ionicons name="videocam" size={32} color={colors.saffron[300]} />
                  <View style={styles.liveBadge}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.viewersBadge}>
                    <Ionicons name="eye" size={12} color={colors.white} />
                    <Text style={styles.viewersText}>
                      {item.viewers.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
                <View style={styles.darshanInfo}>
                  <Text style={styles.darshanTempleName} numberOfLines={1}>
                    {item.templeName}
                  </Text>
                  <View style={styles.darshanMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.stone[400]} />
                    <Text style={styles.darshanCity}>{item.city}</Text>
                    <Text style={styles.darshanDot}>{'  \u2022  '}</Text>
                    <Text style={styles.darshanDeity}>{item.deity}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Pujas Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Pujas</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {popularPujas.map((puja) => (
              <TouchableOpacity key={puja.id} style={styles.pujaCard} activeOpacity={0.8}>
                <View style={styles.pujaIconContainer}>
                  <Ionicons name="flame" size={28} color={colors.saffron[500]} />
                </View>
                <Text style={styles.pujaName} numberOfLines={1}>
                  {puja.name}
                </Text>
                <Text style={styles.pujaDeity}>{puja.deity}</Text>
                <View style={styles.pujaFooter}>
                  <Text style={styles.pujaPrice}>
                    {'\u20B9'}{puja.price.toLocaleString('en-IN')}
                  </Text>
                  <View style={styles.pujaRating}>
                    <Ionicons name="star" size={12} color={colors.amber[500]} />
                    <Text style={styles.pujaRatingText}>{puja.rating}</Text>
                  </View>
                </View>
                <Text style={styles.pujaReviews}>
                  {puja.reviews.toLocaleString('en-IN')} bookings
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Today's Panchang */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"Today's Panchang"}</Text>
          <View style={styles.panchangCard}>
            <View style={styles.panchangHeader}>
              <Ionicons name="sunny" size={20} color={colors.saffron[500]} />
              <Text style={styles.panchangDate}>
                Wednesday, April 15, 2026
              </Text>
            </View>
            <View style={styles.panchangGrid}>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Tithi</Text>
                <Text style={styles.panchangValue}>{panchangData.tithi}</Text>
              </View>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Nakshatra</Text>
                <Text style={styles.panchangValue}>{panchangData.nakshatra}</Text>
              </View>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Sunrise</Text>
                <Text style={styles.panchangValue}>{panchangData.sunrise}</Text>
              </View>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Sunset</Text>
                <Text style={styles.panchangValue}>{panchangData.sunset}</Text>
              </View>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Rahu Kaal</Text>
                <Text style={[styles.panchangValue, styles.panchangWarning]}>
                  {panchangData.rahuKaal}
                </Text>
              </View>
              <View style={styles.panchangItem}>
                <Text style={styles.panchangLabel}>Yoga</Text>
                <Text style={[styles.panchangValue, styles.panchangGood]}>
                  {panchangData.auspicious}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Ask AI Pandit FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={24} color={colors.white} />
        <Text style={styles.fabText}>Ask AI Pandit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  omSymbol: {
    fontSize: 36,
    color: colors.saffron[600],
    lineHeight: 44,
  },
  namaste: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.stone[900],
  },
  welcomeText: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginTop: 1,
  },
  notificationBtn: {
    position: 'relative',
    padding: spacing.sm,
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red[500],
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[200],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: fontSize.base,
    color: colors.stone[400],
  },
  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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
    paddingHorizontal: spacing.md,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red[500],
  },
  seeAll: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.saffron[600],
  },
  horizontalScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  // Darshan Cards
  darshanCard: {
    width: CARD_WIDTH,
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
    marginRight: spacing.sm,
  },
  darshanImagePlaceholder: {
    height: 140,
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
  viewersBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  viewersText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darshanInfo: {
    padding: spacing.sm,
  },
  darshanTempleName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 4,
  },
  darshanMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  darshanCity: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
  },
  darshanDot: {
    fontSize: fontSize.sm,
    color: colors.stone[300],
  },
  darshanDeity: {
    fontSize: fontSize.sm,
    color: colors.saffron[600],
    fontWeight: '500',
  },
  // Puja Cards
  pujaCard: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginRight: spacing.sm,
  },
  pujaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pujaName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 3,
  },
  pujaDeity: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginBottom: spacing.sm,
  },
  pujaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  pujaPrice: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  pujaRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pujaRatingText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[700],
  },
  pujaReviews: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  // Panchang
  panchangCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.saffron[100],
    shadowColor: colors.saffron[200],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  panchangHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  panchangDate: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[700],
  },
  panchangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  panchangItem: {
    width: '47%',
    marginBottom: spacing.xs,
  },
  panchangLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.stone[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  panchangValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[800],
  },
  panchangWarning: {
    color: colors.red[600],
  },
  panchangGood: {
    color: colors.green[600],
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.saffron[600],
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    shadowColor: colors.saffron[700],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
