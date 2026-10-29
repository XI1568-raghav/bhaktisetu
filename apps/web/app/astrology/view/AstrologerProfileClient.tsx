'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../lib/api-config';
import { astrologyFetch } from '../../../lib/astrologer-fetch';
import { formatNumber } from '../../../lib/format-locale';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { availabilitySummary, type PublicAvailability } from '../../../lib/astrologer-availability';
import {
 Star,
 BadgeCheck,
 MessageCircle,
 Phone,
 Video,
 Clock,
 Globe,
 Award,
 ChevronLeft,
 Heart,
 Share2,
 Shield,
 Sparkles,
 Users,
 ThumbsUp,
 ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Astrologer {
 id: string;
 name: string;
 /** Null whenever the API did not supply one — see normalise(). Never a stock face. */
 photo: string | null;
 specializations: string[];
 languages: string[];
 experienceYears: number;
 rating: number;
 reviewCount: number;
 consultationCount: number;
 perMinuteRate: number;
 isOnline: boolean;
 isBusy: boolean;
 bio: string;
 verified: boolean;
 badges: string[];
 /** Weekly hours (IST) or null when none are saved. */
 availability: PublicAvailability | null;
}

interface Review {
 id: string;
 userName: string;
 rating: number;
 comment: string;
 date: string;
}

/* AW-02 (prod sweep 2026-08-12, P0) — THE FIXTURES ARE GONE.
 *
 * What used to sit here:
 *   `allAstrologers` — three invented astrologers ("Pt. Raghunath Sharma",
 *   4.9, 12,450 reviews, 34,200 consultations), each carrying five invented
 *   named testimonials, plus `allAstrologers[id] || allAstrologers['astro_001']`
 *   so ANY id the API did not know rendered as Raghunath Sharma; and
 *   `similarAstrologers` — three more invented people linking to
 *   /astrology/astro_007|006|011, every one of which landed back on this page
 *   under a "Book Paid Consultation" button.
 *
 * POST /consultation/book already refuses a non-onboarded astrologer id with
 * 409 before money moves, so nobody could be charged — but the page still
 * presented people who do not exist, testimonials nobody wrote, and a booking
 * CTA. Refusing the sale at the till is not the same as not advertising it.
 *
 * This page now renders exactly what GET /astrology/astrologers/:id returned,
 * or an honest "not available" pointing at the real directory. Nothing is
 * defaulted, nothing is rounded, nothing is remembered.
 *
 * Reviews are deliberately NOT fetched. When this was written the endpoint was
 * still served from the in-memory mock directory, so calling it would have
 * imported the fiction back through a different door. That directory has since
 * been deleted and GET /astrology/astrologers/:id/reviews now answers an empty
 * page for every real astrologer — there is no astrologer review table yet, so
 * there is still nothing to render. Wire this up only once real reviews are
 * persisted.
 */

/** Coerce the API payload into the view model without inventing anything. */
function normalise(d: Partial<Astrologer>, fallbackId: string): Astrologer {
 const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
 const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
 return {
  id: typeof d.id === 'string' && d.id ? d.id : fallbackId,
  name: String(d.name ?? ''),
  // AW-02: NO STOCK-PORTRAIT FALLBACK. The sibling fix in AstrologyClient.tsx
  // (see its type comment) dropped `photo` from the live contract precisely
  // because the old fixture's stock portraits published strangers' faces as
  // named astrologers' likenesses. A real AstrologerProfile carries no photo
  // column, so this is null far more often than not — render an initial, never
  // a face that belongs to someone else.
  photo: typeof d.photo === 'string' && d.photo ? d.photo : null,
  specializations: list(d.specializations),
  languages: list(d.languages),
  experienceYears: num(d.experienceYears),
  rating: num(d.rating),
  reviewCount: num(d.reviewCount),
  consultationCount: num(d.consultationCount),
  perMinuteRate: num(d.perMinuteRate),
  isOnline: d.isOnline === true,
  isBusy: d.isBusy === true,
  bio: typeof d.bio === 'string' ? d.bio : '',
  verified: d.verified === true,
  badges: list(d.badges),
  availability: d.availability && typeof d.availability === 'object' && 'days' in d.availability ? d.availability : null,
 };
}

// ─── Page Component ───────────────────────────────────────────────────────────

function AstrologerDetailInner() {
 const sp = useSearchParams();
 const id = (sp.get('id') ?? '') as string;

 // P0 #AP-11 (2026-07-09) + AW-02 (2026-08-12): the profile is whatever
 // GET /astrology/astrologers/:id returned, and nothing else. It is `null`
 // while the request is in flight and stays `null` when the API 404s or the
 // fetch fails — there is no remembered person to fall back to.
 const [astrologer, setAstrologer] = useState<Astrologer | null>(null);
 const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');

 useEffect(() => {
  let cancelled = false;
  if (!id) {
   setStatus('missing');
   return;
  }
  setStatus('loading');
  (async () => {
   try {
    // DF-12: this was a bare `fetch`, which never rejects on a stalled socket.
    // The 'missing' state below — the not-found screen this finding asked for —
    // was therefore unreachable in exactly the case the finding reported: the
    // promise stayed pending, `setStatus` never ran again, and the page sat on
    // "Loading astrologer…" with no error, no 404 and no way out. The deadline
    // is what makes every branch after this line reachable.
    const r = await astrologyFetch(`${API_BASE_URL}/astrology/astrologers/${encodeURIComponent(id)}`);
    if (!r.ok) {
     if (!cancelled) setStatus('missing');
     return;
    }
    const j = await r.json();
    const detail = (j as { astrologer?: Partial<Astrologer> })?.astrologer;
    if (cancelled) return;
    if (!detail || typeof detail !== 'object' || !detail.name) {
     setStatus('missing');
     return;
    }
    setAstrologer(normalise(detail, id));
    setStatus('ready');
   } catch {
    if (!cancelled) setStatus('missing');
   }
  })();
  return () => { cancelled = true; };
 }, [id]);

 function getStatusColor() {
 if (astrologer?.isOnline && !astrologer.isBusy) return 'bg-emerald-400';
 if (astrologer?.isOnline && astrologer.isBusy) return 'bg-amber-400';
 return 'bg-surface-400';
 }

 function getStatusText() {
 if (astrologer?.isOnline && !astrologer.isBusy) return 'Online';
 if (astrologer?.isOnline && astrologer.isBusy) return 'Busy';
 return 'Offline';
 }

 function renderStars(rating: number, size = 'w-4 h-4') {
 return (
 <div className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`${size} ${
 star <= Math.round(rating)
 ? 'fill-amber-400 text-amber-400'
 : 'fill-surface-200 text-surface-200'
 }`}
 />
 ))}
 </div>
 );
 }


 // AW-02: nothing renders until the server has named this astrologer. The
 // previous version rendered a fixture immediately and only *maybe* overlaid
 // the real payload, so an unknown id was indistinguishable from a real one.
 if (status === 'loading') {
  return (
   <div className="min-h-[100dvh] bg-surface-50 flex items-center justify-center">
    <p role="status" aria-live="polite" className="text-surface-500">
     Loading astrologer…
    </p>
   </div>
  );
 }

 if (status === 'missing' || !astrologer) {
  return (
   <div className="min-h-[100dvh] bg-surface-50 flex items-center justify-center px-6">
    <div className="max-w-md text-center">
     <h1 className={`${H1.portal} mb-2`}>
      This astrologer profile is not available
     </h1>
     <p className="text-sm text-surface-500 mb-6">
      We only show astrologers we can actually connect you to. Browse the
      approved astrologers who are onboarded right now.
     </p>
     <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Link
       href="/astrology/astrologers/live"
       className={buttonClass('primary', 'md')}
      >
       See approved astrologers <ArrowRight className="w-4 h-4" />
      </Link>
      <Link
       href="/astrology"
       className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-surface-200 text-surface-700"
      >
       Back to Astrology
      </Link>
     </div>
    </div>
   </div>
  );
 }

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* ── Cosmic Header ────────────────────────────────────────────────────── */}
 <div className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 pb-24">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6">
 <Link
 href="/astrology/astrologers/live"
 className="inline-flex items-center gap-1.5 text-sm text-saffron-300/70 hover:text-white transition-colors mb-6"
 >
 <ChevronLeft className="w-4 h-4" />
 Back to Astrologers
 </Link>
 </div>
 </div>

 {/* ── Profile Card (overlapping header) ────────────────────────────────── */}
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 -mt-20">
 <div className="bg-white rounded-xl shadow-xl border border-surface-200/50 overflow-hidden">
 <div className="p-6 lg:p-8">
 <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
 {/* Photo & Status */}
 <div className="shrink-0">
 <div className="relative inline-block">
 {astrologer.photo ? (
 <img
 src={astrologer.photo}
 alt={astrologer.name}
 width={144}
 height={144}
 className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl object-cover shadow-lg"
 />
 ) : (
 <div
 aria-hidden="true"
 className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl bg-saffron-100 flex items-center justify-center shadow-lg"
 >
 <span className="text-3xl font-bold text-saffron-600">
 {astrologer.name.trim().charAt(0).toUpperCase() || '?'}
 </span>
 </div>
 )}
 <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getStatusColor()} rounded-full border-3 border-white shadow-sm`} />
 {astrologer.verified && (
 <div className="absolute -top-2 -right-2 w-7 h-7 bg-saffron-600 rounded-full flex items-center justify-center shadow-sm">
 <BadgeCheck className="w-4 h-4 text-white" />
 </div>
 )}
 </div>
 </div>

 {/* Info */}
 <div className="flex-1">
 <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <h1 className={H1.catalogue}>
 {astrologer.name}
 </h1>
 </div>

 <div className="flex flex-wrap items-center gap-3 mb-3">
 {/* No rating, review count or "0 consultations" is printed for an astrologer
     who has none: there is no review store yet, and "0 reviews" beside five
     empty stars read as a verdict rather than as "new". */}
 {astrologer.rating > 0 ? (
 <div className="flex items-center gap-1.5">
 {renderStars(astrologer.rating)}
 <span className="text-sm font-semibold text-surface-700">{astrologer.rating.toFixed(1)}</span>
 </div>
 ) : (
 <span className="text-sm text-surface-500">Not rated yet</span>
 )}
 {astrologer.reviewCount > 0 && (
 <>
 <span className="text-surface-300">|</span>
 <span className="text-sm text-surface-500">
 {formatNumber(astrologer.reviewCount)} reviews
 </span>
 </>
 )}
 <span className="text-surface-300">|</span>
 <span className="text-sm text-surface-500">
 {astrologer.consultationCount > 0
 ? `${formatNumber(astrologer.consultationCount)} consultations`
 : 'New on Darshya'}
 </span>
 </div>

 {/* Badges */}
 <div className="flex flex-wrap gap-2 mb-3">
 {astrologer.badges.map((badge) => (
 <span
 key={badge}
 className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60"
 >
 {badge}
 </span>
 ))}
 <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
 astrologer.isOnline && !astrologer.isBusy
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
 : astrologer.isBusy
 ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
 : 'bg-surface-50 text-surface-500 border border-surface-200/60'
 }`}>
 {getStatusText()}
 </span>
 </div>

 {/* Meta */}
 <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
 <span className="flex items-center gap-1.5">
 <Clock className="w-4 h-4 text-saffron-400" />
 {astrologer.experienceYears > 0 ? `${astrologer.experienceYears} years experience` : 'Experience not listed'}
 </span>
 {astrologer.languages.length > 0 && (
 <span className="flex items-center gap-1.5">
 <Globe className="w-4 h-4 text-saffron-400" />
 {astrologer.languages.join(', ')}
 </span>
 )}
 </div>
 </div>

 {/* Price & CTA */}
 <div className="sm:text-right shrink-0">
 <div className="mb-3">
 <span className="text-lg font-semibold text-surface-800">{'\u20B9'}{astrologer.perMinuteRate}</span>
 <span className="text-sm text-surface-400">/min</span>
 </div>
 {/* AW-02 (P0), last half: this badge read "First 5 min FREE" and sat
  DIRECTLY above the "Book Paid Consultation" button — the most expensive
  place in the funnel to state a price the platform does not offer. The
  button leads to /astrology/<id>/book, whose cheapest preset is 5 minutes,
  and POST /consultation/book charges round(pricePerMinute x minutes) with
  nothing deducted: the advertised-free five minutes cost 5 x the rate above
  this badge. Free-trial rooms were removed outright by P0 #AP-01/AP-02, so
  there was no implementation to restore — only a claim to stop making.
  Replaced with the billing rule that IS true and that the book page then
  itemises line by line. */}
 <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-1.5 mb-3">
 <Sparkles className="w-3.5 h-3.5 text-amber-500" />
 <span className="text-xs font-semibold text-amber-700">Billed by the minute</span>
 </div>
 <div className="flex flex-col gap-2">
 <Link
 href={`/astrology/${encodeURIComponent(astrologer.id)}/book`}
 className={buttonClass('primary', 'md', 'shadow-md shadow-saffron-500/25')}
 >
 <Video className="w-4 h-4" />
 Book Paid Consultation
 </Link>
 <div className="flex gap-2">
 <button
 type="button"
 className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
 astrologer.isOnline && !astrologer.isBusy
 ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:from-emerald-600 hover:to-green-600'
 : 'bg-surface-100 text-surface-400 cursor-not-allowed'
 }`}
 disabled={!astrologer.isOnline || astrologer.isBusy}
 onClick={() => {
 if (!astrologer.isOnline || astrologer.isBusy) return;
 // AW-02 (P0) — "nobody can deliver", on the one control that is enabled
 // precisely when a human IS reachable. This used to go to
 // `/astrology/chat?astrologer=<name>`, described in its own comment as
 // "the AI chat surface, pre-filled with this astrologer's name". It is
 // not pre-filled with anything: app/astrology/chat/page.tsx never reads a
 // query param, so the name was dropped and the devotee who chose a named
 // person silently got the bot instead, with the astrologer never notified.
 //
 // No astrologer-chat product exists to route to; the only path that
 // reaches this person is the paid consultation room, which is where the
 // sibling "Call" button on this same card was already sent for exactly
 // this reason (P0 #AP-01/AP-02). Both online CTAs now agree, and the
 // booking screen carries the mode choice.
 window.location.href = `/astrology/${encodeURIComponent(astrologer.id)}/book`;
 }}
 >
 <MessageCircle className="w-4 h-4" />
 Chat Now
 </button>
 <button
 type="button"
 className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
 astrologer.isOnline && !astrologer.isBusy
 ? 'border-saffron-200 text-saffron-600 hover:bg-saffron-50'
 : 'border-surface-200 text-surface-400 cursor-not-allowed'
 }`}
 disabled={!astrologer.isOnline || astrologer.isBusy}
 onClick={() => {
 if (!astrologer.isOnline || astrologer.isBusy) return;
 // P0 #AP-01/AP-02 (2026-07-09): free-trial Jitsi rooms are no longer
 // issued — a video room is only embedded for a PAID consultation (see
 // /consultation/[id], which resolves the room via GET /consultation/by-room).
 // Route the caller to the paid booking flow; the room link is returned
 // after Razorpay verification on the success page.
 window.location.href = `/astrology/${encodeURIComponent(astrologer.id)}/book`;
 }}
 >
 <Phone className="w-4 h-4" />
 Call
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* ── Content Grid ─────────────────────────────────────────────────────── */}
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
 {/* Left column — Bio, Specializations */}
 <div className="lg:col-span-2 space-y-6">
 {/* Specializations */}
 {astrologer.specializations.length > 0 && (
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h2 className="text-lg font-bold text-surface-800 mb-4">Specializations</h2>
 <div className="flex flex-wrap gap-2">
 {astrologer.specializations.map((spec) => (
 <span
 key={spec}
 className="px-4 py-2 rounded-xl bg-saffron-50 text-saffron-700 text-sm font-medium border border-saffron-100"
 >
 {spec}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Bio */}
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h2 className="text-lg font-bold text-surface-800 mb-3">About</h2>
 {astrologer.bio.trim() ? (
 <p className="text-surface-600 leading-relaxed whitespace-pre-line">{astrologer.bio}</p>
 ) : (
 <p className="text-sm text-surface-500">This astrologer has not added a bio yet.</p>
 )}
 </div>

 {/* Reviews — AW-02: the five invented testimonials ("Priya M."…) and the
  hardcoded 72/20/5/2/1 distribution that shipped for EVERY astrologer are
  gone. GET /astrology/astrologers/:id/reviews is still backed by the mock
  directory, so there is no honest source to render yet; until real review
  rows exist this section states that plainly rather than filling itself. */}
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h2 className="text-lg font-bold text-surface-800 mb-3">Reviews</h2>
 {astrologer.reviewCount > 0 ? (
 <div className="flex items-center gap-3">
 {renderStars(astrologer.rating, 'w-4 h-4')}
 <span className="text-sm font-semibold text-surface-700">{astrologer.rating}</span>
 <span className="text-sm text-surface-500">
 from {formatNumber(astrologer.reviewCount)} consultations
 </span>
 </div>
 ) : (
 <p className="text-sm text-surface-500">
 No reviews yet. This astrologer has not completed a reviewed consultation
 on Darshya.
 </p>
 )}
 </div>
 </div>

 {/* Right column — Sidebar */}
 <div className="space-y-6">
 {/* Quick Stats */}
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h3 className="text-base font-bold text-surface-800 mb-4">Quick Stats</h3>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-sm text-surface-500 flex items-center gap-2">
 <Users className="w-4 h-4 text-saffron-400" /> Consultations
 </span>
 <span className="text-sm font-bold text-surface-700">{formatNumber(astrologer.consultationCount)}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-surface-500 flex items-center gap-2">
 <Clock className="w-4 h-4 text-saffron-400" /> Experience
 </span>
 <span className="text-sm font-bold text-surface-700">
 {astrologer.experienceYears > 0 ? `${astrologer.experienceYears} years` : 'Not listed'}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-surface-500 flex items-center gap-2">
 <ThumbsUp className="w-4 h-4 text-saffron-400" /> Rating
 </span>
 <span className="text-sm font-bold text-surface-700">
 {astrologer.rating > 0 ? `${astrologer.rating.toFixed(1)}/5.0` : 'Not rated yet'}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-surface-500 flex items-center gap-2">
 <Shield className="w-4 h-4 text-saffron-400" /> Listing
 </span>
 {/* This row read "Verified: Yes" for every astrologer. Only a real admin
     review (astrologer.verified, which the API reports false while approval is
     off) may claim verification. */}
 <span className={`text-sm font-bold ${astrologer.verified ? 'text-emerald-600' : 'text-surface-700'}`}>
 {astrologer.verified ? 'Verified by Darshya' : 'Live on Darshya'}
 </span>
 </div>
 </div>
 </div>

 {astrologer.availability && availabilitySummary(astrologer.availability).length > 0 && (
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h3 className="text-base font-bold text-surface-800 mb-1">Hours for booked slots</h3>
 <p className="text-xs text-surface-500 mb-3">India Standard Time (IST). Instant sessions depend on being online.</p>
 <ul className="space-y-1.5 text-sm text-surface-600">
 {availabilitySummary(astrologer.availability).map((r) => (
 <li key={r.day}><span className="font-semibold text-surface-700">{r.day.slice(0, 3)}</span> {r.text}</li>
 ))}
 </ul>
 </div>
 )}

 {/* Languages */}
 {astrologer.languages.length > 0 && (
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h3 className="text-base font-bold text-surface-800 mb-3">Languages</h3>
 <div className="flex flex-wrap gap-2">
 {astrologer.languages.map((lang) => (
 <span key={lang} className="px-3 py-1.5 bg-saffron-50 text-saffron-600 text-xs font-medium rounded-lg border border-saffron-100">
 {lang}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* AW-02: the "Similar Astrologers" rail listed three invented people
  (Acharya Ramesh Iyer / Tarot Priya Singh / Acharya Bhaskar Rao) with
  invented ratings and rates, each linking to /astrology/astro_00X — a
  fixture id that redirects back here and offers a booking the API refuses
  with 409. It is replaced by a link to the directory of astrologers who
  genuinely exist. */}
 <div className="bg-white rounded-xl border border-surface-200/80 p-6">
 <h3 className="text-base font-bold text-surface-800 mb-2">Other astrologers</h3>
 <p className="text-sm text-surface-500 mb-4">
 Every astrologer in our directory has a live Darshya profile.
 </p>
 <Link
 href="/astrology/astrologers/live"
 className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-600 hover:text-saffron-700"
 >
 See approved astrologers <ArrowRight className="w-4 h-4" />
 </Link>
 </div>

 {/* CTA Card */}
 <div className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 rounded-xl p-6 text-center">
 <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3" />
 <h3 className="text-base font-bold text-white mb-2">Free Kundli Analysis</h3>
 <p className="text-xs text-saffron-200/70 mb-4">
 Get your birth chart generated instantly with our AI tool
 </p>
 <Link
 href="/astrology/kundli"
 className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all"
 >
 Generate Kundli <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

/**
 * DF-12 — the shell that ships BEFORE any JavaScript runs.
 *
 * The sweep's evidence for this finding was literal: main.innerText stayed
 * "Loading…" and there were ZERO requests to the API — so no client code ran at
 * all. That bare "Loading…" is this Suspense fallback (the in-component spinner
 * says "Loading astrologer…"), i.e. the prerendered shell sitting there with its
 * bundle never taking over. A fetch deadline cannot rescue that case: nothing is
 * running to time out.
 *
 * What does survive is HTML. These two anchors are server-rendered, so they work
 * with no JavaScript, no hydration and no API — turning "a permanent spinner
 * with no way to understand what happened or where to go" into a spinner the
 * devotee can walk out of. The loading text stays, so a normal fast load is not
 * dressed up as a failure.
 */
export function ProfileLoadingShell() {
 return (
  <div className="min-h-[100dvh] flex items-center justify-center bg-[#fefcf7] px-6">
   <div className="text-center">
    <p role="status" aria-live="polite" className="text-surface-500">
     Loading…
    </p>
    <p className="mt-4 text-sm text-surface-400">
     Taking too long?{' '}
     <Link href="/astrology/astrologers/live" className="font-semibold text-saffron-600 underline">
      See approved astrologers
     </Link>{' '}
     or go{' '}
     <Link href="/astrology" className="font-semibold text-saffron-600 underline">
      back to Astrology
     </Link>
     .
    </p>
   </div>
  </div>
 );
}

export default function AstrologerProfileClient() {
 return (
  <Suspense fallback={<ProfileLoadingShell />}>
   <AstrologerDetailInner />
  </Suspense>
 );
}
