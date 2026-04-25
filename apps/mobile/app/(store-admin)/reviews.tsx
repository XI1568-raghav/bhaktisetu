import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface PendingReview {
  id: string;
  product: string;
  author: string;
  rating: number;
  comment: string;
  flagged?: string;
}

const PENDING: PendingReview[] = [
  {
    id: '1',
    product: 'Premium Rudraksha Mala',
    author: 'Anonymous',
    rating: 1,
    comment: 'Worst product ever. SCAM SCAM SCAM',
    flagged: 'Profanity / spam',
  },
  {
    id: '2',
    product: 'Brass Ganesha Idol',
    author: 'Sanjay R.',
    rating: 4,
    comment: 'Beautiful idol, packaging was excellent.',
  },
  {
    id: '3',
    product: 'Bhagavad Gita',
    author: 'Kavya P.',
    rating: 5,
    comment: 'Translation is wonderful. Highly recommended.',
  },
];

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < count ? 'star' : 'star-outline'} size={14} color={colors.amber[500]} />
      ))}
    </View>
  );
}

export default function StoreReviews() {
  const [items, setItems] = useState<PendingReview[]>(PENDING);

  function act(id: string, action: 'approve' | 'reject') {
    Alert.alert(action === 'approve' ? 'Approved' : 'Rejected', `Review #${id} ${action}d.`);
    setItems((s) => s.filter((it) => it.id !== id));
  }

  return (
    <PortalScreen title="Review Queue" subtitle={`${items.length} pending moderation`}>
      <Section title="Pending Approval">
        {items.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.head}>
              <View>
                <Text style={styles.product}>{r.product}</Text>
                <Text style={styles.author}>{r.author}</Text>
              </View>
              <Stars count={r.rating} />
            </View>
            <Text style={styles.comment}>{r.comment}</Text>
            {r.flagged ? (
              <View style={styles.flagPill}>
                <Ionicons name="warning" size={11} color={colors.red[600]} />
                <Text style={styles.flagText}>{r.flagged}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => act(r.id, 'approve')}
                style={[styles.btn, { backgroundColor: colors.green[600] }]}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={14} color={colors.white} />
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => act(r.id, 'reject')}
                style={[styles.btn, { backgroundColor: colors.red[600] }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={colors.white} />
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
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
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  product: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  author: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  comment: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20, marginTop: spacing.sm },
  flagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  flagText: { fontSize: fontSize.xs, color: colors.red[600], fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  btnText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
});
