'use client';

import { useState } from 'react';
import { Star, MessageSquare, ThumbsUp, User, Calendar, Filter, Package } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface ProductReview {
 id: string;
 customerName: string;
 productName: string;
 rating: number;
 comment: string;
 date: string;
 helpful: number;
 verified: boolean;
}

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

// ─── Mock Data ──────────────────────────────────────────────────

const mockReviews: ProductReview[] = [
 {
 id: '1',
 customerName: 'Priya Mehta',
 productName: 'Brass Diya Set (Pack of 6)',
 rating: 5,
 comment: 'Beautiful brass diyas with very fine traditional design work. The cotton wicks included are a nice touch. Used them for Diwali and they looked stunning.',
 date: '2026-04-14',
 helpful: 18,
 verified: true,
 },
 {
 id: '2',
 customerName: 'Rajesh Kumar',
 productName: '5 Mukhi Rudraksha Mala',
 rating: 5,
 comment: 'Authentic rudraksha beads, very well strung. The certificate of authenticity gives confidence. Energy feels positive when wearing it for meditation.',
 date: '2026-04-12',
 helpful: 24,
 verified: true,
 },
 {
 id: '3',
 customerName: 'Anita Singh',
 productName: 'Camphor Tablets (Pack of 100)',
 rating: 4,
 comment: 'Good quality camphor that burns cleanly. Only giving 4 stars because some tablets were slightly smaller than others. But the fragrance is wonderful.',
 date: '2026-04-10',
 helpful: 6,
 verified: true,
 },
 {
 id: '4',
 customerName: 'Deepak Verma',
 productName: 'Silver Plated Ganesh Idol (6 inch)',
 rating: 5,
 comment: 'Exquisite craftsmanship! The detailing on Ganeshji is remarkable. Packaging was very careful with bubble wrap and a velvet box. Perfect gift for griha pravesh.',
 date: '2026-04-08',
 helpful: 31,
 verified: true,
 },
 {
 id: '5',
 customerName: 'Sunita Devi',
 productName: 'Complete Puja Thali Set',
 rating: 4,
 comment: 'Very good quality German silver thali set. All items included as listed. The bell sound is melodious. The kumkum box lid is slightly loose though.',
 date: '2026-04-06',
 helpful: 9,
 verified: true,
 },
 {
 id: '6',
 customerName: 'Manoj Tiwari',
 productName: 'Premium Agarbatti Box (12 Fragrances)',
 rating: 5,
 comment: 'Fantastic variety of fragrances! The sandalwood and mogra ones are my favorite. Not too overpowering like chemical incense sticks. These are clearly hand-rolled.',
 date: '2026-04-04',
 helpful: 15,
 verified: true,
 },
 {
 id: '7',
 customerName: 'Kavita Reddy',
 productName: 'Kumkum & Haldi Gift Set',
 rating: 3,
 comment: 'The brass containers are pretty but the kumkum quantity is less for the price. Would have appreciated a bit more product inside. The haldi is good quality though.',
 date: '2026-04-01',
 helpful: 4,
 verified: false,
 },
 {
 id: '8',
 customerName: 'Vikram Chauhan',
 productName: 'Brass Diya Set (Pack of 6)',
 rating: 5,
 comment: 'Ordered for the second time. Consistent quality. These diyas have become a permanent part of our evening aarti routine.',
 date: '2026-03-28',
 helpful: 11,
 verified: true,
 },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────

export default function StoreAdminReviewsPage() {
 const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

 const filteredReviews = mockReviews.filter((r) => {
 if (ratingFilter === 'all') return true;
 return r.rating === parseInt(ratingFilter);
 });

 const totalReviews = mockReviews.length;
 const avgRating = mockReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
 const ratingDistribution = [5, 4, 3, 2, 1].map((r) => ({
 stars: r,
 count: mockReviews.filter((rev) => rev.rating === r).length,
 percentage: (mockReviews.filter((rev) => rev.rating === r).length / totalReviews) * 100,
 }));

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-surface-800">Product Reviews</h1>
 <p className="text-surface-500 mt-1">See what customers are saying about your products</p>
 </div>

 {/* Rating Summary */}
 <div className="bg-white rounded-xl border border-surface-100 p-6">
 <div className="flex flex-col sm:flex-row gap-8">
 <div className="text-center sm:text-left shrink-0">
 <div className="text-5xl font-bold text-surface-800">{avgRating.toFixed(1)}</div>
 <div className="flex items-center gap-1 justify-center sm:justify-start mt-2">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 className={`w-5 h-5 ${
 s <= Math.round(avgRating) ? 'text-temple-gold fill-temple-gold' : 'text-surface-200'
 }`}
 />
 ))}
 </div>
 <p className="text-sm text-surface-500 mt-1">{totalReviews} reviews</p>
 </div>
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
 ? 'bg-emerald-600 text-white'
 : 'bg-white border border-surface-200 text-surface-600 hover:border-emerald-300'
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
 </div>
 ) : (
 <div className="space-y-4">
 {filteredReviews.map((review) => (
 <div key={review.id} className="bg-white rounded-xl border border-surface-100 p-5">
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
 <User className="w-5 h-5 text-emerald-600" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="text-sm font-semibold text-surface-800">{review.customerName}</h3>
 {review.verified && (
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-tulsi-green-light/30 text-tulsi-green">
 Verified Purchase
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 mb-1">
 <Package className="w-3.5 h-3.5 text-surface-400" />
 <span className="text-xs font-medium text-emerald-700">{review.productName}</span>
 </div>
 <div className="flex items-center gap-2 mb-2">
 <div className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((s) => (
 <Star
 key={s}
 className={`w-3.5 h-3.5 ${
 s <= review.rating ? 'text-temple-gold fill-temple-gold' : 'text-surface-200'
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
 <span className="flex items-center gap-1">
 <ThumbsUp className="w-3.5 h-3.5" />
 {review.helpful} found helpful
 </span>
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
