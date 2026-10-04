import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePriestDashboard } from '@poojly/api-client';
import { usePriestReviews } from '../../lib/provider-queries';
import {
  selectPriestReviews,
  selectPriestRatingSummary,
  formatReviewDate,
} from '../../lib/priest-reviews';
import { PortalScreen, Section, StatCard, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * NO FABRICATED REVIEWS ON THIS SCREEN.
 *
 * This file used to carry a literal:
 *
 *   const FALLBACK_REVIEWS: Review[] = [
 *     { devotee: 'Anjali S.', rating: 5, comment: 'Beautiful Rudrabhishek. Felt
 *       every mantra. Video proof was very clear.', pujaName: 'Rudrabhishek',
 *       date: '3 days ago' },
 *     { devotee: 'Ramesh K.', rating: 5, comment: 'Pandit ji explained every
 *       step. Prasad arrived on time.', … },
 *     { devotee: 'Priya M.',  rating: 4, comment: 'Very devotional. Slight
 *       delay in prasad delivery…', … },
 *   ];
 *
 * — three named people who do not exist, quoted praising pujas that were never
 * performed, rendered to EVERY pandit who had not yet completed a booking, and
 * then averaged into the "Average 4.7 / Total 3" header above them. A new
 * pandit's first sight of his own reviews page was three glowing testimonials
 * he had never earned.
 *
 * The completed-booking branch was the same defect wearing a real name: it
 * mapped each finished booking to `rating: 5` unconditionally with the comment
 * "Devotee feedback will appear once submitted." So a pandit whose devotees had
 * rated him two stars — or not rated him at all — still saw five gold stars per
 * row, attributed to a real, identifiable devotee.
 *
 * `GET /api/v1/priest/reviews` has existed since routes/priest.ts:1003. It
 * merges `Review` rows with rated `PujaBooking` rows and returns real ratings
 * and real comments. That is the only source this screen reads now. The
 * headline average and count come off `GET /priest/dashboard`'s
 * `priest.ratingAvg` / `priest.ratingCount` — the platform's own figures — and
 * are never recomputed from the (capped, merged) list, which would print a
 * different number here than on the dashboard tab.
 *
 * The devotee's NAME is not in the payload — the handler selects `userId` only
 * — so rows say "A devotee". Inventing a display name is how this screen got
 * into trouble the first time.
 */

function Stars({ count }: { count: number | null }) {
  if (count === null) return null;
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
  const dashboardQuery = usePriestDashboard();
  const reviewsQuery = usePriestReviews();
  const [refreshing, setRefreshing] = useState(false);

  const reviews = selectPriestReviews(reviewsQuery.data);
  const summary = selectPriestRatingSummary(dashboardQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), reviewsQuery.refetch()]);
    setRefreshing(false);
  }

  const loadError = reviewsQuery.isError
    ? reviewsQuery.error instanceof Error
      ? reviewsQuery.error.message
      : 'Could not load your reviews.'
    : !reviewsQuery.isLoading && reviews === null
      ? 'The server returned an unexpected response.'
      : null;

  return (
    <PortalScreen
      title="Reviews"
      subtitle={
        summary.count === null
          ? 'What devotees said'
          : `${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'} from devotees`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load your reviews: {loadError}</Text>
          <Text style={styles.errorHint}>Pull down to retry.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Average"
          value={summary.average === null ? '—' : summary.average.toFixed(1)}
          hint={summary.average === null ? 'not rated yet' : 'out of 5'}
          accent={colors.amber[500]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Total"
          value={summary.count === null ? '—' : summary.count}
          hint="ratings"
        />
      </View>

      <Section title="Recent Reviews">
        {reviewsQuery.isLoading && reviews === null ? (
          <EmptyHint text="Loading your reviews…" />
        ) : reviews === null ? (
          <EmptyHint text="Reviews could not be loaded." />
        ) : reviews.length === 0 ? (
          <EmptyHint text="No devotee has rated you yet. Ratings appear here as soon as one does." />
        ) : (
          reviews.map((r) => {
            const when = formatReviewDate(r.createdAt);
            const meta = [r.pujaName, r.bookingNumber, when].filter(Boolean).join(' • ');
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.author}>A devotee</Text>
                  <Stars count={r.rating} />
                </View>
                {meta ? <Text style={styles.puja}>{meta}</Text> : null}
                {r.comment ? (
                  <Text style={styles.comment}>{r.comment}</Text>
                ) : (
                  <Text style={styles.noComment}>Rated without leaving a comment.</Text>
                )}
              </View>
            );
          })
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  puja: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 4, marginBottom: 6 },
  comment: { fontSize: fontSize.sm, color: colors.stone[700], lineHeight: 20 },
  noComment: { fontSize: fontSize.sm, color: colors.stone[400], fontStyle: 'italic' },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2 },
});
