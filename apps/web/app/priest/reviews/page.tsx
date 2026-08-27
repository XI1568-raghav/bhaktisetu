'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Star,
  MessageSquare,
  User,
  Calendar,
  Filter,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { getMyReviews, type PriestReview } from '../../../lib/pandit-api';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';

// ─── Types ──────────────────────────────────────────────────────

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Devotee identity is not joined on the backend response yet — show a stable
// short-ID label so the cards don't read as blank. Swap to fullName when the
// review payload gains a user join.
function devoteeLabel(userId: string): string {
  return `Devotee ${userId.slice(0, 6)}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestReviewsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [reviews, setReviews] = useState<PriestReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getMyReviews(token);
      setReviews(rows);
    } catch (err) {
      setError(userFacingMessage(err, 'Could not load your reviews. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter === 'all') return true;
    return r.rating === parseInt(ratingFilter);
  });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => {
    const count = reviews.filter((rev) => rev.rating === r).length;
    return {
      stars: r,
      count,
      percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
    };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={H1.portal}>Reviews</h1>
          <p className="text-surface-500 mt-1">
            See what devotees say about your puja services
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || !token}
          className="p-1.5 rounded-md text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Refresh"
          aria-label="Refresh reviews"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Retry banner on error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Rating Summary */}
      {loading && reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-100 p-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="shrink-0 space-y-2">
              <div className="h-8 w-16 bg-surface-100 rounded" />
              <div className="h-4 w-24 bg-surface-100 rounded" />
            </div>
            <div className="flex-1 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3 bg-surface-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-100 p-6">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="text-center sm:text-left shrink-0">
              <div
                className="text-3xl font-semibold tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-text)',
                }}
              >
                {totalReviews > 0 ? avgRating.toFixed(1) : '—'}
              </div>
              <div className="flex items-center gap-1 justify-center sm:justify-start mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(avgRating)
                        ? 'text-temple-gold fill-temple-gold'
                        : 'text-surface-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {totalReviews} review{totalReviews === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex-1 space-y-2">
              {ratingDistribution.map((rd) => (
                <div key={rd.stars} className="flex items-center gap-3">
                  <span className="text-sm text-surface-600 w-12">
                    {rd.stars} star
                  </span>
                  <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-temple-gold rounded-full transition-all duration-500"
                      style={{ width: `${rd.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-surface-500 w-8 text-right">
                    {rd.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-surface-400" />
        <div className="flex gap-1 overflow-x-auto">
          {(['all', '5', '4', '3', '2', '1'] as RatingFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setRatingFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                ratingFilter === f
                  ? 'bg-saffron-600 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-saffron-300'
              }`}
            >
              {f === 'all' ? 'All' : `${f} Stars`}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {loading && reviews.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-surface-100 p-5 animate-pulse"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-surface-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-surface-100 rounded" />
                  <div className="h-3 w-24 bg-surface-100 rounded" />
                  <div className="h-3 w-full bg-surface-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <MessageSquare className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">
            No reviews yet
          </h3>
          <p className="prose-meta text-surface-500 mt-1 max-w-sm text-center">
            {ratingFilter === 'all'
              ? 'Devotees can leave reviews after completing bookings.'
              : 'No reviews match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-surface-100 p-5"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-saffron-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-surface-800">
                      {devoteeLabel(review.userId)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating
                              ? 'text-temple-gold fill-temple-gold'
                              : 'text-surface-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-surface-600 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
