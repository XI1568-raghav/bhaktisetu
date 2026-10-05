'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
 CheckCircle,
 ChevronRight,
 ChevronLeft,
 Calendar,
 User,
 Package,
 CreditCard,
 Star,
 Home,
 Shield,
 Sparkles,
 Phone,
} from 'lucide-react';
import { homePujaCategories } from '../../../../lib/home-pujas';
import { getPublicPriests, type PriestSummary } from '../../../../lib/pandit-api';
import { remoteImage, IMG_W } from '../../../../lib/images';
import { PanditAvatar } from '../../PanditAvatar';
import { DateInput } from '../../../../components/ui/DateInput';
import { WizardSteps } from '../../../../components/ui/WizardSteps';

import { buttonClass } from '../../../../components/ui/button-recipe';
import { H1 } from '../../../../components/ui/heading-recipe';
import { CANCELLATION_BADGE_LABEL } from '../../../../lib/cancellation-policy';
type StepId = 1 | 2 | 3 | 4 | 5;

/**
 * TC-05 / TC-08. Step 2 used to list `homePandits` filtered by the category's
 * `recommendedPanditIds` — eight hand-typed people with invented names, cities,
 * university credentials, star ratings, review counts in the hundreds, per-tier
 * prices and a `verified: { aadhaar, background, vedicCert }` block, under the
 * heading "N verified specialists available for <ceremony>".
 *
 * It now reads the real directory over `GET /priests`. That list can be empty,
 * and a required step over an empty list is an unfinishable checkout, so "no
 * preference" is a selectable value and travels through to the coordinator.
 */
const NO_PREFERENCE = 'no-preference';

const steps = [
 { id: 1 as StepId, label: 'Event details', icon: Calendar },
 { id: 2 as StepId, label: 'Select pandit', icon: User },
 { id: 3 as StepId, label: 'Samagri', icon: Package },
 { id: 4 as StepId, label: 'Your details', icon: Home },
 { id: 5 as StepId, label: 'Review & pay', icon: CreditCard },
];

const timeSlots = [
 { id: 'morning', label: 'Morning', window: '7:00 AM – 11:00 AM' },
 { id: 'afternoon', label: 'Afternoon', window: '12:00 PM – 3:00 PM' },
 { id: 'evening', label: 'Evening', window: '5:00 PM – 8:00 PM' },
];

const PUJA_TIERS = ['basic', 'standard', 'premium'] as const;
type PujaTier = (typeof PUJA_TIERS)[number];

// PF-01, second half. Each ceremony page exposes four CTAs — "Book Now",
// "Choose basic", "Choose standard", "Choose premium" — and all four carry the
// chosen tier through to this wizard. The wizard read `slug` but hardcoded the
// tier to 'standard', so "Choose premium" silently downgraded the devotee to a
// cheaper package and quoted a price they had not picked. Same defect class as
// the rest of this sweep: one side of the contract honoured, the other not.
function readTier(raw: string | null): PujaTier {
  return (PUJA_TIERS as readonly string[]).includes(raw ?? '')
    ? (raw as PujaTier)
    : 'standard';
}

function BookHomePujaInner() {
 const searchParams = useSearchParams();
 const slug = (searchParams.get('slug') ?? '') as string;
 const category = useMemo(
 () => homePujaCategories.find((c) => c.slug === slug),
 [slug],
 );
 const [priests, setPriests] = useState<PriestSummary[] | null>(null);

 useEffect(() => {
  let cancelled = false;
  // getPublicPriests catches its own failures and answers [], so an API that is
  // down yields the same honest "no preference only" step as an API with no
  // published pandits — never a fabricated roster.
  void getPublicPriests().then((list) => {
   if (!cancelled) setPriests(list);
  });
  return () => {
   cancelled = true;
  };
 }, []);

 // The deleted fixture mapped each category to four hand-picked ids. The real
 // directory carries `specializations`, so match on those and fall back to the
 // whole list rather than showing an empty step when nobody is tagged.
 const pandits = useMemo(() => {
  const all = priests ?? [];
  if (!category) return all;
  const needle = category.name.toLowerCase();
  const matched = all.filter((p) =>
   p.specializations.some(
    (s) => s.toLowerCase().includes(needle) || needle.includes(s.toLowerCase()),
   ),
  );
  return matched.length > 0 ? matched : all;
 }, [category, priests]);

 const [step, setStep] = useState<StepId>(1);

 // Step 1 — Event details
 const [date, setDate] = useState('');
 const [slot, setSlot] = useState('');
 const [duration, setDuration] = useState(category?.duration ?? '');
 const [address, setAddress] = useState('');
 const [city, setCity] = useState('');
 const [pincode, setPincode] = useState('');

 // Step 2
 const [panditId, setPanditId] = useState<string>('');

 // Step 3 — seeded from the CTA the devotee actually clicked.
 const [tier, setTier] = useState<PujaTier>(() => readTier(searchParams.get('tier')));

 // Step 4
 const [name, setName] = useState('');
 const [phone, setPhone] = useState('');
 const [gotra, setGotra] = useState('');
 const [requests, setRequests] = useState('');

 // Step 5 — payment
 const [paying, setPaying] = useState(false);
 const [paid, setPaid] = useState(false);

 const selectedPandit = pandits.find((p) => p.id === panditId);
 // One derivation for the confirmation screen, the review row, the sticky
 // sidebar and the coordinator email, so the four cannot disagree.
 const panditLabel = selectedPandit
  ? selectedPandit.displayName
  : panditId === NO_PREFERENCE
   ? 'No preference — coordinator to match'
   : '';
 const totalAmount = category ? category.pricing[tier] : 0;

 if (!category) {
 return (
 <div className="min-h-[100dvh] flex items-center justify-center p-6">
 <div className="text-center">
 <h1 className={H1.portal}>Puja not found</h1>
 <Link href="/pujas/home-puja" className="text-saffron-600 font-medium mt-4 inline-block">
 Browse home pujas
 </Link>
 </div>
 </div>
 );
 }

 const canProceed = (): boolean => {
 if (step === 1) return !!(date && slot && address && city && pincode);
 if (step === 2) return !!panditId;
 if (step === 3) return !!tier;
 if (step === 4) return !!(name && phone.length >= 10);
 return true;
 };

 const goNext = () => {
 if (canProceed() && step < 5) setStep((step + 1) as StepId);
 };
 const goBack = () => {
 if (step > 1) setStep((step - 1) as StepId);
 };

 // P0 #PBO-5 (2026-07-09): home-puja categories + pandits are a mock catalog
 // (lib/home-pujas.ts) with no backing PriestPujaOffering rows, so there is no
 // real templeOfferingId / priestId to book against — a paid checkout here
 // would be fabricated. The old handler faked a "Booking confirmed!" screen
 // with a random BS-number, deceiving the devotee into thinking they'd booked.
 // Until the catalog is migrated to real priest offerings, this is an honest
 // "request a callback" CTA: it captures the devotee's intent (category, date,
 // preferred pandit) and routes them to ops to confirm — no fake booking id,
 // no fake payment, no false success.
 const handlePay = () => {
 setPaying(true);
 setTimeout(() => {
 setPaying(false);
 setPaid(true);
 }, 600);
 };

 if (paid) {
 const callbackSubject = encodeURIComponent(`Home Puja request — ${category.name}`);
 const callbackBody = encodeURIComponent(
 `I'd like to book a home puja.\n\nCategory: ${category.name}\nPreferred pandit: ${panditLabel || 'No preference'}\nPreferred date: ${date || 'Flexible'}\nTime slot: ${slot || 'Flexible'}\nTier: ${tier}\n\nPlease call me to confirm.`,
 );
 const opsPhone = '+919255109400';
 return (
 <div className="min-h-[100dvh] bg-surface-50 flex items-center justify-center p-6">
 <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-2xl shadow-warm-md p-8 text-center">
 <div className="w-16 h-16 rounded-full bg-saffron-100 flex items-center justify-center mx-auto mb-4">
 <Phone className="w-8 h-8 text-saffron-600" />
 </div>
 <h2 className="text-2xl font-bold text-surface-800">Request received</h2>
 <p className="mt-3 text-surface-600 text-sm">
 Online booking for <span className="font-semibold text-surface-800">{category.name}</span> isn&apos;t available yet.
 Our pooja coordinator will call you to confirm the date, pandit, and pricing.
 </p>
 {panditLabel && (
 <p className="mt-3 text-surface-500 text-sm">
 Preferred pandit: <span className="font-medium text-surface-700">{panditLabel}</span>
 {date && <> · {date}</>}
 </p>
 )}
 <div className="mt-6 flex flex-col gap-2">
 <a
 href={`tel:${opsPhone}`}
 className={buttonClass('primary', 'md')}
 >
 Call now to confirm
 </a>
 <a
 href={`mailto:care@darshya.online?subject=${callbackSubject}&body=${callbackBody}`}
 className="block py-3 rounded-lg font-semibold bg-surface-100 text-surface-800 border border-[var(--color-border)]"
 >
 Email us the details
 </a>
 <Link
 href="/pujas/home-puja"
 className="block py-3 rounded-lg font-semibold bg-surface-100 text-surface-800 border border-[var(--color-border)]"
 >
 Book another
 </Link>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-[100dvh] bg-surface-50 pb-20">
 {/* Breadcrumb */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
 <nav className="text-sm text-surface-500 flex items-center gap-1.5">
 <Link href="/pujas" className="hover:text-saffron-600">Pujas</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href="/pujas/home-puja" className="hover:text-saffron-600">Home Puja</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <Link href={`/pujas/home-puja/${category.slug}`} className="hover:text-saffron-600">
 {category.name}
 </Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">Book</span>
 </nav>
 </div>

 {/* Header */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
 <h1 className={H1.catalogue}>
 Book {category.name}
 </h1>
 <p className="text-surface-500 mt-1 text-sm">{category.tagline}</p>
 </div>

 {/* Stepper */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 md:p-5">
 <WizardSteps steps={steps} current={step} />
 </div>
 </div>

 {/* Content */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.4fr_1fr] gap-6">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 md:p-8">
 {step === 1 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Event details</h2>
 <p className="text-sm text-surface-500 mb-6">When and where should the puja be performed?</p>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Date</label>
 <DateInput
 value={date}
 onChange={(v) => setDate(v)}
 min={new Date().toISOString().split('T')[0]}
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Time slot</label>
 <div className="grid sm:grid-cols-3 gap-2">
 {timeSlots.map((t) => (
 <button
 key={t.id}
 type="button"
 onClick={() => setSlot(t.id)}
 className={`text-left p-3 rounded-lg border-2 transition-all ${
 slot === t.id
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <div className="font-semibold text-sm text-surface-800">{t.label}</div>
 <div className="text-xs text-surface-500 mt-0.5">{t.window}</div>
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration</label>
 <input
 type="text"
 value={duration}
 onChange={(e) => setDuration(e.target.value)}
 placeholder={category.duration}
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 <div className="text-xs text-surface-400 mt-1">Typical: {category.duration}</div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Venue address</label>
 <textarea
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 rows={3}
 placeholder="House no, society, street"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">City</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="Mumbai"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Pincode</label>
 <input
 type="text"
 value={pincode}
 onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
 placeholder="400001"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {step === 2 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Select pandit</h2>
 <p className="text-sm text-surface-500 mb-6">
 {priests === null
 ? 'Loading pandits\u2026'
 : pandits.length > 0
 ? `${pandits.length} pandit${pandits.length === 1 ? '' : 's'} listed on Darshya. Pick one, or let the coordinator match you.`
 : `No pandit profiles are published yet. The pooja coordinator will match you with a pandit for ${category.name} when they call.`}
 </p>

 <div className="space-y-3">
 {pandits.map((p) => (
 <label
 key={p.id}
 className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
 panditId === p.id
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <input
 type="radio"
 name="home-puja-pandit"
 checked={panditId === p.id}
 onChange={() => setPanditId(p.id)}
 className="sr-only"
 />
 <PanditAvatar
 src={p.avatarUrl ? remoteImage(p.avatarUrl, IMG_W.THUMB) : null}
 name={p.displayName}
 className="w-14 h-14 rounded-lg text-lg"
 />
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-surface-800">{p.displayName}</div>
 {p.specializations.length > 0 && (
 <div className="text-xs text-surface-500 mt-0.5 truncate">
 {p.specializations.slice(0, 3).join(' \u00b7 ')}
 </div>
 )}
 <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
 {/* TC-05: a rating renders only where a devotee actually left one.
     The deleted fixture printed 4.7-4.9 for every row. */}
 {p.ratingCount > 0 ? (
 <span className="flex items-center gap-1">
 <Star className="w-3 h-3 text-temple-gold fill-temple-gold" />
 <span className="font-semibold">{p.ratingAvg.toFixed(1)}</span>
 <span className="text-surface-400">({p.ratingCount})</span>
 </span>
 ) : (
 <span className="text-surface-400">No reviews yet</span>
 )}
 {p.experienceYears > 0 && (
 <>
 <span className="text-surface-300">&middot;</span>
 <span className="text-surface-500">{p.experienceYears}+ yrs</span>
 </>
 )}
 </div>
 {p.languages.length > 0 && (
 <div className="text-xs text-surface-500 mt-1">
 Languages: {p.languages.slice(0, 4).join(', ')}
 </div>
 )}
 </div>
 </label>
 ))}

 {/* The directory can legitimately be empty, and a required step over an
     empty list is an unfinishable checkout. "No preference" is a real
     selection and travels through to the coordinator request. */}
 <label
 className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
 panditId === NO_PREFERENCE
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <input
 type="radio"
 name="home-puja-pandit"
 checked={panditId === NO_PREFERENCE}
 onChange={() => setPanditId(NO_PREFERENCE)}
 className="sr-only"
 />
 <div className="w-14 h-14 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
 <User className="w-6 h-6 text-surface-400" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-surface-800">No preference</div>
 <div className="text-xs text-surface-500 mt-0.5">
 The pooja coordinator matches a pandit to your ceremony, date and language.
 </div>
 </div>
 </label>
 </div>
 </div>
 )}

 {step === 3 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Samagri preference</h2>
 <p className="text-sm text-surface-500 mb-6">Choose the quality tier. Pandit brings everything.</p>

 <div className="space-y-3">
 {(['basic', 'standard', 'premium'] as const).map((t) => (
 <label
 key={t}
 className={`block p-5 rounded-xl border-2 cursor-pointer transition-all ${
 tier === t
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <input
 type="radio"
 checked={tier === t}
 onChange={() => setTier(t)}
 className="sr-only"
 />
 <div className="flex items-start justify-between mb-3">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wide text-surface-500">
 {t}
 </div>
 <div className="text-2xl font-bold text-surface-800 mt-0.5">
 ₹{category.pricing[t].toLocaleString('en-IN')}
 </div>
 </div>
 {t === 'standard' && (
 <span className="bg-saffron-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
 Recommended
 </span>
 )}
 </div>
 <ul className="space-y-1.5">
 {category.pricingDetails[t].map((d, i) => (
 <li key={i} className="flex gap-2 text-sm text-surface-600">
 <CheckCircle className="w-4 h-4 text-tulsi-green flex-shrink-0 mt-0.5" />
 <span>{d}</span>
 </li>
 ))}
 </ul>
 </label>
 ))}
 </div>
 </div>
 )}

 {step === 4 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Your details</h2>
 <p className="text-sm text-surface-500 mb-6">We&rsquo;ll use these for the sankalp and coordination.</p>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Full name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="As per records for sankalp"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Phone number</label>
 <input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
 placeholder="10-digit mobile"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Family gotra <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <input
 type="text"
 value={gotra}
 onChange={(e) => setGotra(e.target.value)}
 placeholder="e.g. Kashyap, Bharadwaj"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 <div className="text-xs text-surface-400 mt-1">If unknown, pandit uses a general sankalp.</div>
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Special requests <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <textarea
 value={requests}
 onChange={(e) => setRequests(e.target.value)}
 rows={3}
 placeholder="e.g. Elderly relative needs seat, prefer English explanation, specific samagri"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 </div>
 </div>
 )}

 {step === 5 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Review & pay</h2>
 <p className="text-sm text-surface-500 mb-6">Verify details and complete secure payment.</p>

 <div className="space-y-3">
 <Row label="Puja" value={category.name} />
 <Row label="Pandit" value={panditLabel || '—'} />
 <Row label="Date" value={date || '—'} />
 <Row label="Slot" value={slot ? timeSlots.find((t) => t.id === slot)?.label ?? slot : '—'} />
 <Row label="Address" value={`${address}, ${city} ${pincode}`} />
 <Row label="Samagri tier" value={<span className="capitalize">{tier}</span>} />
 <Row label="Host name" value={name || '—'} />
 <Row label="Phone" value={phone || '—'} />
 {gotra && <Row label="Gotra" value={gotra} />}
 {requests && <Row label="Special requests" value={requests} />}
 </div>

 <div className="mt-6 pt-5 border-t border-[var(--color-divider)] space-y-2">
 <div className="flex justify-between text-sm text-surface-600">
 <span>Subtotal</span>
 <span>₹{totalAmount.toLocaleString('en-IN')}</span>
 </div>
 <div className="flex justify-between text-sm text-surface-600">
 <span>GST (18%)</span>
 <span>₹{Math.round(totalAmount * 0.18).toLocaleString('en-IN')}</span>
 </div>
 <div className="flex justify-between text-lg font-bold text-surface-800 pt-2 border-t border-[var(--color-divider)]">
 <span>Total</span>
 <span>₹{Math.round(totalAmount * 1.18).toLocaleString('en-IN')}</span>
 </div>
 </div>

 <button
 onClick={handlePay}
 disabled={paying}
 className={buttonClass('primary', 'md', 'w-full mt-6')}
 >
 {paying ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Submitting...
 </>
 ) : (
 <>
 <Phone className="w-4 h-4" />
 Request callback
 </>
 )}
 </button>
 <div className="mt-3 flex items-center justify-center gap-2 text-xs text-surface-500">
 <Shield className="w-3.5 h-3.5" />
 Indicative pricing — final quote on call
 </div>
 </div>
 )}

 {/* Nav */}
 {step < 5 && (
 <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-divider)]">
 <button
 onClick={goBack}
 disabled={step === 1}
 className="inline-flex items-center gap-1.5 text-surface-600 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:text-saffron-600"
 >
 <ChevronLeft className="w-4 h-4" />
 Back
 </button>
 <button
 onClick={goNext}
 disabled={!canProceed()}
 className={buttonClass('primary', 'md', 'disabled:cursor-not-allowed')}
 >
 Continue
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 )}
 {step === 5 && (
 <div className="mt-6 text-center">
 <button onClick={goBack} className="text-sm text-surface-500 hover:text-saffron-600 inline-flex items-center gap-1">
 <ChevronLeft className="w-3.5 h-3.5" />
 Back to edit
 </button>
 </div>
 )}
 </div>

 {/* Sidebar summary */}
 <aside className="lg:sticky lg:top-24 lg:h-fit space-y-4">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
 <h3 className="font-bold text-surface-800 mb-3">Booking summary</h3>
 <div className="space-y-2.5 text-sm">
 <div className="flex justify-between">
 <span className="text-surface-500">Puja</span>
 <span className="font-medium text-surface-800 text-right">{category.name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-surface-500">Tier</span>
 <span className="font-medium text-surface-800 capitalize">{tier}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-surface-500">Duration</span>
 <span className="font-medium text-surface-800">{category.duration}</span>
 </div>
 {panditLabel && (
 <div className="flex justify-between">
 <span className="text-surface-500">Pandit</span>
 <span className="font-medium text-surface-800 text-right">{panditLabel}</span>
 </div>
 )}
 {date && (
 <div className="flex justify-between">
 <span className="text-surface-500">Date</span>
 <span className="font-medium text-surface-800">{date}</span>
 </div>
 )}
 </div>
 <div className="mt-4 pt-4 border-t border-[var(--color-divider)]">
 <div className="flex justify-between items-baseline">
 <span className="text-sm text-surface-500">Amount</span>
 <span className="text-xl font-bold text-surface-800">
 ₹{totalAmount.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="text-xs text-surface-400 text-right mt-0.5">+ GST</div>
 </div>
 </div>

 <div className="bg-sandal-cream border border-temple-gold/30 rounded-xl p-5">
 <h4 className="font-bold text-surface-800 text-sm flex items-center gap-2 mb-2">
 <Sparkles className="w-4 h-4 text-temple-gold-dark" />
 What to expect
 </h4>
 <ul className="space-y-2 text-xs text-surface-700">
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Our team contacts you to confirm the details
 </li>
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Pandit arrives with all samagri
 </li>
 {/* LEG-03 (F223): read "Free cancellation 24 hours before" — a full-refund
     promise at the exact hour DEFAULT_CANCEL_POLICY drops to 75%, printed
     inside the checkout wizard's "What to expect" list. Sourced from
     lib/cancellation-policy, like every other cancellation surface. */}
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 {CANCELLATION_BADGE_LABEL}
 </li>
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Prasadam included
 </li>
 </ul>
 </div>
 </aside>
 </div>
 </div>
 );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
 return (
 <div className="flex justify-between gap-4 text-sm">
 <span className="text-surface-500">{label}</span>
 <span className="font-medium text-surface-800 text-right max-w-[60%]">{value}</span>
 </div>
 );
}

export default function BookHomePujaClient() {
 return (
  <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><div className="text-surface-500">Loading…</div></div>}>
   <BookHomePujaInner />
  </Suspense>
 );
}
