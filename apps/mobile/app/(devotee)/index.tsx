import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDarshan, usePujas, usePanchang } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

// Fallback mock data — only used if the API is unreachable or returns empty.
const FALLBACK_DARSHAN = [
  { id: '1', templeName: 'Shri Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', viewers: 12450, isLive: true },
  { id: '2', templeName: 'Tirumala Venkateswara', city: 'Tirupati', deity: 'Lord Venkateswara', viewers: 28300, isLive: true },
  { id: '3', templeName: 'Shree Siddhivinayak', city: 'Mumbai', deity: 'Lord Ganesha', viewers: 8760, isLive: true },
];

const FALLBACK_PUJAS = [
  { id: '1', name: 'Rudrabhishek', deity: 'Lord Shiva', price: 1100, rating: 4.9, reviews: 2340 },
  { id: '2', name: 'Satyanarayan Katha', deity: 'Lord Vishnu', price: 2100, rating: 4.8, reviews: 1890 },
  { id: '3', name: 'Ganesh Atharvashirsha', deity: 'Lord Ganesha', price: 751, rating: 4.9, reviews: 3100 },
  { id: '4', name: 'Sunderkand Path', deity: 'Lord Hanuman', price: 551, rating: 4.7, reviews: 1540 },
];

export default function HomeScreen() {
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

  const darshanList =
    (darshan.data?.data && darshan.data.data.length > 0
      ? darshan.data.data.slice(0, 3).map((d) => ({
          id: d.id,
          templeName: d.temple?.name ?? d.title ?? 'Temple',
          city: d.temple?.city ?? '',
          deity: d.temple?.deity ?? '',
          viewers: d.viewerCount ?? 0,
          isLive: String(d.status).toLowerCase() === 'live',
        }))
      : FALLBACK_DARSHAN) as typeof FALLBACK_DARSHAN;

  // PujaType doesn't carry price (TemplePujaOffering does). Use fallback prices
  // to keep the home tile useful — names/deities still come from real data.
  const apiPujaNames = pujas.data?.data?.slice(0, 4) ?? [];
  const pujaList = apiPujaNames.length > 0
    ? apiPujaNames.map((p, i) => ({
        id: p.id,
        name: p.name,
        deity: p.deity,
        price: FALLBACK_PUJAS[i % FALLBACK_PUJAS.length]!.price,
        rating: FALLBACK_PUJAS[i % FALLBACK_PUJAS.length]!.rating,
        reviews: FALLBACK_PUJAS[i % FALLBACK_PUJAS.length]!.reviews,
      }))
    : FALLBACK_PUJAS;

  const panchangData = {
    tithi: panchang.data?.data?.tithi ?? 'Dwadashi (Shukla Paksha)',
    nakshatra: panchang.data?.data?.nakshatra ?? 'Uttara Phalguni',
    sunrise: panchang.data?.data?.sunrise ?? '06:02 AM',
    sunset: panchang.data?.data?.sunset ?? '06:41 PM',
    rahuKaal: panchang.data?.data?.rahukaal ?? '07:30 AM - 09:00 AM',
    auspicious: panchang.data?.data?.abhijitMuhurta ?? 'Sarvartha Siddhi Yoga',
  };

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
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/(devotee)/profile' as any)}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.stone[700]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.7}
          onPress={() => router.push('/(devotee)/pujas' as any)}
        >
          <Ionicons name="search-outline" size={18} color={colors.stone[500]} />
          <Text style={styles.searchPlaceholder}>Search pujas, temples, content…</Text>
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

                <View style={styles.quickActionsRow}>
          <QuickAction icon="planet" label="Kundli" onPress={() => router.push('/(devotee)/kundli' as any)} />
          <QuickAction icon="star" label="Horoscope" onPress={() => router.push('/(devotee)/horoscope' as any)} />
          <QuickAction icon="map" label="Yatra" onPress={() => router.push('/(devotee)/yatra' as any)} />
          <QuickAction icon="heart" label="Weddings" onPress={() => router.push('/(devotee)/weddings' as any)} />
          <QuickAction icon="diamond" label="Premium" onPress={() => router.push('/(devotee)/upgrade' as any)} />
        </View>

        <View style={styles.panchangCard}>
          <View style={styles.panchangHeader}>
            <Ionicons name="sunny" size={18} color={colors.amber[500]} />
            <Text style={styles.panchangTitle}>Today&apos;s Panchang</Text>
          </View>
          <View style={styles.panchangRow}>
            <PanchangItem label="Tithi" value={panchangData.tithi} />
            <PanchangItem label="Nakshatra" value={panchangData.nakshatra} />
          </View>
          <View style={styles.panchangRow}>
            <PanchangItem label="Sunrise" value={panchangData.sunrise} />
            <PanchangItem label="Sunset" value={panchangData.sunset} />
          </View>
          <View style={styles.auspiciousBadge}>
            <Ionicons name="star" size={14} color={colors.amber[600]} />
            <Text style={styles.auspiciousText}>{panchangData.auspicious}</Text>
          </View>
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
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {darshanList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.darshanCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(devotee)/darshan' as any)}
                >
                  <View style={styles.darshanThumb}>
                    <Ionicons name="videocam" size={36} color={colors.white} />
                    {item.isLive ? (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.darshanInfo}>
                    <Text style={styles.darshanTitle} numberOfLines={1}>{item.templeName}</Text>
                    <Text style={styles.darshanSub} numberOfLines={1}>{item.deity} • {item.city}</Text>
                    <View style={styles.viewersRow}>
                      <Ionicons name="eye" size={12} color={colors.stone[500]} />
                      <Text style={styles.viewersText}>{item.viewers.toLocaleString()} watching</Text>
                    </View>
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
          ) : (
            <View style={styles.pujaGrid}>
              {pujaList.map((puja) => (
                <TouchableOpacity
                  key={puja.id}
                  style={styles.pujaCard}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(devotee)/pujas' as any)}
                >
                  <View style={styles.pujaIcon}>
                    <Ionicons name="flame" size={26} color={colors.saffron[600]} />
                  </View>
                  <Text style={styles.pujaName} numberOfLines={1}>{puja.name}</Text>
                  <Text style={styles.pujaDeity} numberOfLines={1}>{puja.deity}</Text>
                  <View style={styles.pujaFooter}>
                    <Text style={styles.pujaPrice}>₹{puja.price}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={11} color={colors.amber[500]} />
                      <Text style={styles.ratingText}>{puja.rating}</Text>
                    </View>
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

function QuickAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={20} color={colors.saffron[700]} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PanchangItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.panchangItem}>
      <Text style={styles.panchangLabel}>{label}</Text>
      <Text style={styles.panchangValue} numberOfLines={1}>{value}</Text>
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
    width: 40, height: 40, borderRadius: 20,
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
  searchPlaceholder: { fontSize: fontSize.base, color: colors.stone[500] },
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
  auspiciousBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start',
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
    width: CARD_WIDTH, backgroundColor: colors.white,
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
  pujaCard: {
    width: '48%', backgroundColor: colors.white,
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
