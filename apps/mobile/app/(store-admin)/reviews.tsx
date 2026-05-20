import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStoreAdminReviews } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

function Stars({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons key={i} name={i < count ? 'star' : 'star-outline'} size={14} color={colors.amber[500]} />
      ))}
    </View>
  );
}

function relTime(iso: string | undefined): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function StoreReviews() {
  const reviewsQuery = useStoreAdminReviews();
  const [refreshing, setRefreshing] = useState(false);

  const reviews = reviewsQuery.data?.reviews ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await reviewsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Reviews"
      subtitle={`${reviews.length} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Section title="All Reviews">
        {reviewsQuery.isLoading ? (
          <EmptyHint text="Loading reviews…" />
        ) : reviewsQuery.isError ? (
          <EmptyHint text="Could not load reviews. Pull to refresh." />
        ) : reviews.length === 0 ? (
          <EmptyHint text="No reviews yet." />
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.product}>{r.productName ?? 'Store'}</Text>
                  <Text style={styles.author}>
                    {(r.customer ?? 'Customer')} • {relTime(r.createdAt)}
                  </Text>
                </View>
                <Stars count={r.rating ?? 0} />
              </View>
              {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
            </View>
          ))
        )}
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
});
