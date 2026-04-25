import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortalScreen, Section, StatCard } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface Review {
  id: string;
  devotee: string;
  rating: number;
  comment: string;
  pujaName: string;
  date: string;
}

const REVIEWS: Review[] = [
  {
    id: '1',
    devotee: 'Anjali S.',
    rating: 5,
    comment: 'Beautiful Rudrabhishek. Felt every mantra. Video proof was very clear.',
    pujaName: 'Rudrabhishek',
    date: '3 days ago',
  },
  {
    id: '2',
    devotee: 'Ramesh K.',
    rating: 5,
    comment: 'Pandit ji explained every step. Prasad arrived on time.',
    pujaName: 'Satyanarayan Katha',
    date: '1 week ago',
  },
  {
    id: '3',
    devotee: 'Priya M.',
    rating: 4,
    comment: 'Very devotional. Slight delay in prasad delivery but the puja was excellent.',
    pujaName: 'Ganesh Atharvashirsha',
    date: '2 weeks ago',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={14}
          color={colors.amber[500]}
        />
      ))}
    </View>
  );
}

export default function PriestReviews() {
  const total = REVIEWS.length;
  const average = total > 0 ? REVIEWS.reduce((a, r) => a + r.rating, 0) / total : 0;

  return (
    <PortalScreen title="Reviews" subtitle={`${total} from devotees`}>
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Average"
          value={average.toFixed(1)}
          hint="out of 5"
          accent={colors.amber[500]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Total" value={total} hint="reviews" />
      </View>

      <Section title="Recent Reviews">
        {REVIEWS.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.author}>{r.devotee}</Text>
              <Stars count={r.rating} />
            </View>
            <Text style={styles.puja}>
              {r.pujaName} • {r.date}
            </Text>
            <Text style={styles.comment}>{r.comment}</Text>
          </View>
        ))}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  puja: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4, marginBottom: 6 },
  comment: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
});
