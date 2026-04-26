'use client';

import { useState } from 'react';
import { Star, MessageSquare, ThumbsUp, User, Calendar, Filter } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface Review {
  id: string;
  devoteeName: string;
  pujaName: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  templeName: string;
}

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

// ─── Mock Data ──────────────────────────────────────────────────

const mockReviews: Review[] = [
  {
    id: '1',
    devoteeName: 'Rajesh Kumar',
    pujaName: 'Rudrabhishek Puja',
    rating: 5,
    comment: 'Panditji performed the puja with utmost devotion and sincerity. Every mantra was chanted perfectly, and the video proof was excellent. Truly blessed to have had this experience.',
    date: '2026-04-14',
    helpful: 12,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
  {
    id: '2',
    devoteeName: 'Sunita Devi',
    pujaName: 'Satyanarayan Katha',
    rating: 5,
    comment: 'Very professional and knowledgeable. Explained each ritual step patiently during the live stream. My family felt very connected despite being far from the temple.',
    date: '2026-04-12',
    helpful: 8,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
  {
    id: '3',
    devoteeName: 'Amit Patel',
    pujaName: 'Maha Mrityunjay Jaap',
    rating: 4,
    comment: 'Good puja performance. The only suggestion would be to improve the camera angle during the havan portion. Otherwise, very satisfied with the mantras and overall experience.',
    date: '2026-04-10',
    helpful: 5,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
  {
    id: '4',
    devoteeName: 'Priya Singh',
    pujaName: 'Ganesh Atharvashirsha Path',
    rating: 5,
    comment: 'Absolutely wonderful! Panditji started right on time and the prasad delivery was prompt. Will definitely book again for upcoming festivals.',
    date: '2026-04-08',
    helpful: 15,
    templeName: 'Trimbakeshwar Temple',
  },
  {
    id: '5',
    devoteeName: 'Deepak Verma',
    pujaName: 'Navgraha Shanti Puja',
    rating: 4,
    comment: 'Thorough knowledge of all nine graha mantras. Puja took a bit longer than expected but the quality was worth it. Thank you Panditji.',
    date: '2026-04-05',
    helpful: 3,
    templeName: 'Trimbakeshwar Temple',
  },
  {
    id: '6',
    devoteeName: 'Meena Agarwal',
    pujaName: 'Rudrabhishek Puja',
    rating: 5,
    comment: 'Second time booking with Pandit Ramesh ji. Consistently excellent service. The sankalp was taken with proper gotra and nakshatra details.',
    date: '2026-04-02',
    helpful: 7,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
  {
    id: '7',
    devoteeName: 'Vikram Chauhan',
    pujaName: 'Satyanarayan Katha',
    rating: 3,
    comment: 'The puja was done well but the video had some audio issues in the middle. Content and ritual wise it was good.',
    date: '2026-03-28',
    helpful: 2,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
  {
    id: '8',
    devoteeName: 'Kavita Reddy',
    pujaName: 'Maha Mrityunjay Jaap',
    rating: 5,
    comment: 'My mother was very ill and this puja brought so much peace to our family. Panditji was very empathetic and performed beautifully. God bless him.',
    date: '2026-03-25',
    helpful: 20,
    templeName: 'Shri Kashi Vishwanath Temple',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestReviewsPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [helpfulClicked, setHelpfulClicked] = useState<Set<string>>(new Set());

  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter === 'all') return true;
    return r.rating === parseInt(ratingFilter);
  });

  const totalReviews = reviews.length;
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rev) => rev.rating === r).length,
    percentage: (reviews.filter((rev) => rev.rating === r).length / totalReviews) * 100,
  }));

  const handleHelpful = (reviewId: string) => {
    if (helpfulClicked.has(reviewId)) return; // already voted
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, helpful: r.helpful + 1 } : r));
    setHelpfulClicked((prev) => new Set([...prev, reviewId]));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Reviews</h1>
        <p className="text-surface-500 mt-1">See what devotees say about your puja services</p>
      </div>

      {/* Rating Summary */}
      <div className="bg-white rounded-xl border border-surface-100 p-6">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Average Rating */}
          <div className="text-center sm:text-left shrink-0">
            <div className="text-3xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>{avgRating.toFixed(1)}</div>
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
            <p className="text-sm text-surface-500 mt-1">{totalReviews} reviews</p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-2">
            {ratingDistribution.map((rd) => (
              <div key={rd.stars} className="flex items-center gap-3">
                <span className="text-sm text-surface-600 w-12">{rd.stars} star</span>
                <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-temple-gold rounded-full transition-all duration-500"
                    style={{ width: `${rd.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-surface-500 w-8 text-right">{rd.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
      {filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <MessageSquare className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No reviews found</h3>
          <p className="text-sm text-surface-500 mt-1">No reviews match the selected filter.</p>
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
                    <h3 className="text-sm font-semibold text-surface-800">{review.devoteeName}</h3>
                    <span className="text-xs text-surface-400">&middot;</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
                      {review.pujaName}
                    </span>
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
                      {formatDate(review.date)}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 leading-relaxed">{review.comment}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
                    <button
                      onClick={() => handleHelpful(review.id)}
                      disabled={helpfulClicked.has(review.id)}
                      className={`flex items-center gap-1 transition-colors ${
                        helpfulClicked.has(review.id)
                          ? 'text-saffron-600 cursor-default'
                          : 'hover:text-saffron-600 cursor-pointer'
                      }`}
                      title={helpfulClicked.has(review.id) ? 'You marked this helpful' : 'Mark as helpful'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${helpfulClicked.has(review.id) ? 'fill-saffron-600' : ''}`} />
                      {review.helpful} found helpful
                    </button>
                    <span>{review.templeName}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
