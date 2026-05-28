import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAstrologers, useHoroscope } from '@poojly/api-client';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Rashi {
  id: string;
  name: string;
  nameHindi: string;
  symbol: string;
  dateRange: string;
  element: string;
  ruling: string;
  luckyColor: string;
}

const rashiData: Rashi[] = [
  { id: '1', name: 'Mesh', nameHindi: '\u092E\u0947\u0937', symbol: '\u2648', dateRange: 'Mar 21 - Apr 19', element: 'Fire', ruling: 'Mars', luckyColor: 'Red' },
  { id: '2', name: 'Vrishabh', nameHindi: '\u0935\u0943\u0937\u092D', symbol: '\u2649', dateRange: 'Apr 20 - May 20', element: 'Earth', ruling: 'Venus', luckyColor: 'Green' },
  { id: '3', name: 'Mithun', nameHindi: '\u092E\u093F\u0925\u0941\u0928', symbol: '\u264A', dateRange: 'May 21 - Jun 20', element: 'Air', ruling: 'Mercury', luckyColor: 'Yellow' },
  { id: '4', name: 'Kark', nameHindi: '\u0915\u0930\u094D\u0915', symbol: '\u264B', dateRange: 'Jun 21 - Jul 22', element: 'Water', ruling: 'Moon', luckyColor: 'White' },
  { id: '5', name: 'Simha', nameHindi: '\u0938\u093F\u0902\u0939', symbol: '\u264C', dateRange: 'Jul 23 - Aug 22', element: 'Fire', ruling: 'Sun', luckyColor: 'Gold' },
  { id: '6', name: 'Kanya', nameHindi: '\u0915\u0928\u094D\u092F\u093E', symbol: '\u264D', dateRange: 'Aug 23 - Sep 22', element: 'Earth', ruling: 'Mercury', luckyColor: 'Green' },
  { id: '7', name: 'Tula', nameHindi: '\u0924\u0941\u0932\u093E', symbol: '\u264E', dateRange: 'Sep 23 - Oct 22', element: 'Air', ruling: 'Venus', luckyColor: 'Blue' },
  { id: '8', name: 'Vrishchik', nameHindi: '\u0935\u0943\u0936\u094D\u091A\u093F\u0915', symbol: '\u264F', dateRange: 'Oct 23 - Nov 21', element: 'Water', ruling: 'Mars', luckyColor: 'Maroon' },
  { id: '9', name: 'Dhanu', nameHindi: '\u0927\u0928\u0941', symbol: '\u2650', dateRange: 'Nov 22 - Dec 21', element: 'Fire', ruling: 'Jupiter', luckyColor: 'Purple' },
  { id: '10', name: 'Makar', nameHindi: '\u092E\u0915\u0930', symbol: '\u2651', dateRange: 'Dec 22 - Jan 19', element: 'Earth', ruling: 'Saturn', luckyColor: 'Black' },
  { id: '11', name: 'Kumbh', nameHindi: '\u0915\u0941\u0902\u092D', symbol: '\u2652', dateRange: 'Jan 20 - Feb 18', element: 'Air', ruling: 'Saturn', luckyColor: 'Blue' },
  { id: '12', name: 'Meen', nameHindi: '\u092E\u0940\u0928', symbol: '\u2653', dateRange: 'Feb 19 - Mar 20', element: 'Water', ruling: 'Jupiter', luckyColor: 'Sea Green' },
];

interface AstrologyService {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  duration: string;
}

const services: AstrologyService[] = [
  {
    id: '1',
    name: 'Kundli Generation',
    description: 'Detailed birth chart with planetary positions and dasha periods.',
    price: 299,
    icon: 'planet',
    duration: '24 hours',
  },
  {
    id: '2',
    name: 'Kundli Matching',
    description: 'Gun Milan for marriage compatibility with Ashtakoot analysis.',
    price: 499,
    icon: 'heart',
    duration: '24 hours',
  },
  {
    id: '3',
    name: 'Personal Consultation',
    description: 'One-on-one video call with a certified Vedic astrologer.',
    price: 1499,
    icon: 'videocam',
    duration: '45 min session',
  },
  {
    id: '4',
    name: 'Annual Prediction',
    description: 'Detailed year-ahead forecast covering career, health, and relationships.',
    price: 999,
    icon: 'calendar',
    duration: '48 hours',
  },
];

function RashiCard({ rashi, isSelected, onPress }: { rashi: Rashi; isSelected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.rashiCard, isSelected && styles.rashiCardSelected]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text style={styles.rashiSymbol}>{rashi.symbol}</Text>
      <Text style={[styles.rashiName, isSelected && styles.rashiNameSelected]}>
        {rashi.name}
      </Text>
      <Text style={styles.rashiHindi}>{rashi.nameHindi}</Text>
    </TouchableOpacity>
  );
}

export default function AstrologyScreen() {
  const [selectedRashi, setSelectedRashi] = useState<string | null>(null);
  const selected = rashiData.find((r) => r.id === selectedRashi);
  const astrologersQuery = useAstrologers();
  const horoscopeQuery = useHoroscope(selected ? selected.name.toLowerCase() : '');
  const [refreshing, setRefreshing] = useState(false);

  const astrologerCount = astrologersQuery.data?.total ?? astrologersQuery.data?.astrologers?.length ?? 0;
  const horoscopeRaw = horoscopeQuery.data?.horoscope as { prediction?: string } | undefined;
  const dailyHoroscope =
    horoscopeRaw?.prediction ??
    'Today brings positive energy. Focus on personal growth and spiritual practice. Evening is auspicious for new beginnings.';

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([astrologersQuery.refetch(), selected ? horoscopeQuery.refetch() : Promise.resolve()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Astrology</Text>
          <Text style={styles.headerSubtitle}>
            Vedic astrology insights and kundli services
          </Text>
        </View>

        {/* Rashi Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rashi</Text>
          <View style={styles.rashiGrid}>
            {rashiData.map((rashi) => (
              <RashiCard
                key={rashi.id}
                rashi={rashi}
                isSelected={selectedRashi === rashi.id}
                onPress={() => setSelectedRashi(rashi.id)}
              />
            ))}
          </View>
        </View>

        {/* Selected Rashi Detail */}
        {selected && (
          <View style={styles.section}>
            <View style={styles.rashiDetailCard}>
              <Text style={styles.rashiDetailSymbol}>{selected.symbol}</Text>
              <Text style={styles.rashiDetailName}>
                {selected.name} ({selected.nameHindi})
              </Text>
              <Text style={styles.rashiDetailDates}>{selected.dateRange}</Text>
              <View style={styles.rashiDetailGrid}>
                <View style={styles.rashiDetailItem}>
                  <Text style={styles.rashiDetailLabel}>Element</Text>
                  <Text style={styles.rashiDetailValue}>{selected.element}</Text>
                </View>
                <View style={styles.rashiDetailItem}>
                  <Text style={styles.rashiDetailLabel}>Ruling Planet</Text>
                  <Text style={styles.rashiDetailValue}>{selected.ruling}</Text>
                </View>
                <View style={styles.rashiDetailItem}>
                  <Text style={styles.rashiDetailLabel}>Lucky Color</Text>
                  <Text style={styles.rashiDetailValue}>{selected.luckyColor}</Text>
                </View>
              </View>
              <View style={styles.horoscopePreview}>
                <Ionicons name="sparkles" size={16} color={colors.saffron[500]} />
                <Text style={styles.horoscopeText}>{dailyHoroscope}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Astrology Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Astrology Services{astrologerCount > 0 ? ` • ${astrologerCount} astrologers online` : ''}
          </Text>
          <View style={styles.servicesList}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => {
                  if (service.name.toLowerCase().includes('kundli')) {
                    router.push('/(devotee)/kundli' as any);
                    return;
                  }
                  Linking.openURL(`https://darshya.online/astrology?utm_source=mobile-app&utm_medium=service-card&service=${encodeURIComponent(service.name)}`);
                }}
              >
                <View style={styles.serviceIconContainer}>
                  <Ionicons name={service.icon} size={22} color={colors.saffron[600]} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <View style={styles.serviceFooter}>
                    <Text style={styles.servicePrice}>
                      {'\u20B9'}{service.price.toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.serviceDuration}>
                      <Ionicons name="time-outline" size={10} color={colors.stone[400]} />
                      <Text style={styles.serviceDurationText}>{service.duration}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Astrologer CTA */}
        <View style={styles.section}>
          <View style={styles.aiCard}>
            <Ionicons name="sparkles" size={28} color={colors.saffron[600]} />
            <Text style={styles.aiCardTitle}>AI Jyotish Assistant</Text>
            <Text style={styles.aiCardDescription}>
              Get instant astrological insights powered by AI. Ask about your birth chart, compatibility, muhurat, and more.
            </Text>
            <TouchableOpacity style={styles.aiButton} activeOpacity={0.7} onPress={() => Linking.openURL('https://darshya.online/astrology/chat?utm_source=mobile-app&utm_medium=ai-cta')}>
              <Ionicons name="chatbubble-ellipses" size={16} color={colors.white} />
              <Text style={styles.aiButtonText}>Ask AI Jyotish</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: spacing.xl,
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
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.sm,
  },
  // Rashi Grid
  rashiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rashiCard: {
    width: '22.5%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stone[100],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rashiCardSelected: {
    borderColor: colors.saffron[400],
    backgroundColor: colors.saffron[50],
  },
  rashiSymbol: {
    fontSize: 24,
    marginBottom: 2,
  },
  rashiName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.stone[700],
  },
  rashiNameSelected: {
    color: colors.saffron[700],
  },
  rashiHindi: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  // Rashi Detail
  rashiDetailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.saffron[100],
    shadowColor: colors.saffron[200],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  rashiDetailSymbol: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  rashiDetailName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 4,
  },
  rashiDetailDates: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    marginBottom: spacing.md,
  },
  rashiDetailGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rashiDetailItem: {
    alignItems: 'center',
  },
  rashiDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rashiDetailValue: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.stone[800],
  },
  horoscopePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.saffron[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    width: '100%',
  },
  horoscopeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 20,
  },
  // Services
  servicesList: {
    gap: spacing.sm,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.saffron[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: 3,
  },
  serviceDescription: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servicePrice: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.saffron[700],
  },
  serviceDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serviceDurationText: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
  },
  // AI Card
  aiCard: {
    backgroundColor: colors.stone[900],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  aiCardTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  aiCardDescription: {
    fontSize: fontSize.sm,
    color: colors.stone[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.saffron[600],
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  aiButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
