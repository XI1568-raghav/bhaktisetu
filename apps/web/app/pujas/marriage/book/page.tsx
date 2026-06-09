'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
 CheckCircle,
 ChevronRight,
 ChevronLeft,
 Calendar,
 Heart,
 User,
 Package,
 CreditCard,
 Star,
 BadgeCheck,
 Home,
 Shield,
 Sparkles,
 Lock,
 Users,
} from 'lucide-react';
import {
 weddingPandits,
 marriagePricingTiers,
 marriageAddOns,
 marriageTypes,
} from '../../../../lib/home-pujas';
import { DateInput } from '../../../../components/ui/DateInput';

type StepId = 1 | 2 | 3 | 4 | 5;

const steps = [
 { id: 1 as StepId, label: 'Couple & date', icon: Heart },
 { id: 2 as StepId, label: 'Ceremony type', icon: Sparkles },
 { id: 3 as StepId, label: 'Select pandit', icon: User },
 { id: 4 as StepId, label: 'Venue & details', icon: Home },
 { id: 5 as StepId, label: 'Review & pay', icon: CreditCard },
];

const languageOptions = ['Hindi', 'Sanskrit', 'English', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'];

export default function BookMarriage() {
 const [step, setStep] = useState<StepId>(1);

 // Step 1 — Couple
 const [brideName, setBrideName] = useState('');
 const [groomName, setGroomName] = useState('');
 const [weddingDate, setWeddingDate] = useState('');
 const [muhuratTime, setMuhuratTime] = useState('');

 // Step 2 — ceremony
 const [ceremonyType, setCeremonyType] = useState('hindu-vivah');
 const [tier, setTier] = useState('traditional');
 const [addOns, setAddOns] = useState<string[]>([]);

 // Step 3 — pandit
 const [panditId, setPanditId] = useState('');

 // Step 4 — venue
 const [venueType, setVenueType] = useState<'home' | 'banquet' | 'farmhouse'>('banquet');
 const [venueAddress, setVenueAddress] = useState('');
 const [city, setCity] = useState('');
 const [guestCount, setGuestCount] = useState('');
 const [traditions, setTraditions] = useState('');
 const [language, setLanguage] = useState('Hindi + English');
 const [brideContact, setBrideContact] = useState('');

 const [paying, setPaying] = useState(false);
 const [paid, setPaid] = useState(false);

 const selectedPandit = weddingPandits.find((p) => p.id === panditId);
 const selectedTier = marriagePricingTiers.find((t) => t.slug === tier);
 const tierAmount = selectedTier?.price ?? 0;
 const addOnAmount = addOns.length * 2500;
 const total = tierAmount + addOnAmount;

 const canProceed = (): boolean => {
 if (step === 1) return !!(brideName && groomName && weddingDate);
 if (step === 2) return !!(ceremonyType && tier);
 if (step === 3) return !!panditId;
 if (step === 4) return !!(venueAddress && city && brideContact.length >= 10);
 return true;
 };

 const goNext = () => canProceed() && step < 5 && setStep((step + 1) as StepId);
 const goBack = () => step > 1 && setStep((step - 1) as StepId);

 const toggleAddOn = (a: string) => {
 setAddOns((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
 };

 const handlePay = () => {
 setPaying(true);
 setTimeout(() => {
 setPaying(false);
 setPaid(true);
 }, 2000);
 };

 if (paid) {
 return (
 <div className="min-h-[100dvh] bg-surface-50 flex items-center justify-center p-6">
 <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-2xl shadow-warm-md p-8 text-center">
 <div className="w-16 h-16 rounded-full bg-tulsi-green/15 flex items-center justify-center mx-auto mb-4">
 <Heart className="w-8 h-8 text-vermillion-500" />
 </div>
 <h2 className="text-2xl font-bold text-surface-800">Your wedding is booked!</h2>
 <p className="mt-2 text-surface-500 text-sm">
 Booking ID: <span className="font-mono font-semibold text-surface-800">BS-20260421-
 {Math.floor(10000 + Math.random() * 90000)}</span>
 </p>
 <p className="mt-4 text-surface-600">
 {selectedPandit?.name} will officiate the sacred ceremony of{' '}
 <span className="font-semibold">{brideName} &amp; {groomName}</span> on {weddingDate}. Our wedding coordinator will call within 2 hours.
 </p>
 <div className="mt-6 flex flex-col gap-2">
 <Link
 href="/dashboard"
 className="block py-3 rounded-lg font-semibold text-white"
 style={{ background: 'var(--color-primary)' }}
 >
 View booking
 </Link>
 <Link
 href="/pujas/marriage"
 className="block py-3 rounded-lg font-semibold bg-surface-100 text-surface-800 border border-[var(--color-border)]"
 >
 Back to marriage
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
 <Link href="/pujas/marriage" className="hover:text-saffron-600">Marriage</Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-700 font-medium">Book</span>
 </nav>
 </div>

 {/* Header */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
 <h1 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
 Book your wedding pandit
 </h1>
 <p className="text-surface-500 mt-1 text-sm">Sampoorna vivah sanskar in 5 steps.</p>
 </div>

 {/* Stepper */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 md:p-5">
 <div className="flex items-center gap-2 md:gap-3 overflow-x-auto">
 {steps.map((s, i) => {
 const Icon = s.icon;
 const active = s.id === step;
 const done = s.id < step;
 return (
 <div key={s.id} className="flex items-center gap-2 md:gap-3 flex-shrink-0">
 <div
 className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
 active
 ? 'bg-saffron-500 text-white'
 : done
 ? 'bg-tulsi-green text-white'
 : 'bg-surface-100 text-surface-400'
 }`}
 >
 {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
 </div>
 <div className={`text-xs md:text-sm font-medium whitespace-nowrap ${active ? 'text-surface-800' : 'text-surface-500'}`}>
 {s.label}
 </div>
 {i < steps.length - 1 && (
 <div className={`w-4 md:w-8 h-px ${done ? 'bg-tulsi-green' : 'bg-surface-200'}`} />
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.4fr_1fr] gap-6">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 md:p-8">
 {step === 1 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Couple & wedding date</h2>
 <p className="text-sm text-surface-500 mb-6">Names as you want them used in sankalp.</p>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Bride&rsquo;s name
 </label>
 <input
 type="text"
 value={brideName}
 onChange={(e) => setBrideName(e.target.value)}
 placeholder="Full name"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Groom&rsquo;s name
 </label>
 <input
 type="text"
 value={groomName}
 onChange={(e) => setGroomName(e.target.value)}
 placeholder="Full name"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Wedding date
 </label>
 <DateInput
 value={weddingDate}
 onChange={(v) => setWeddingDate(v)}
 min={new Date().toISOString().split('T')[0]}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Muhurat time <span className="text-surface-400 font-normal">(if known)</span>
 </label>
 <input
 type="time"
 value={muhuratTime}
 onChange={(e) => setMuhuratTime(e.target.value)}
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 <div className="text-xs text-surface-400 mt-1">
 Not sure? Pandit can calculate muhurat for you.
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {step === 2 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Ceremony type & tier</h2>
 <p className="text-sm text-surface-500 mb-6">Choose the tradition and depth of rituals.</p>

 <div className="mb-6">
 <label className="block text-sm font-medium text-surface-700 mb-2">Tradition</label>
 <div className="grid sm:grid-cols-2 gap-2">
 {marriageTypes.map((t) => (
 <button
 key={t.slug}
 type="button"
 onClick={() => setCeremonyType(t.slug)}
 className={`text-left p-3 rounded-lg border-2 transition-all ${
 ceremonyType === t.slug
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <div className="font-semibold text-sm text-surface-800">{t.name}</div>
 <div className="text-xs text-surface-500 mt-0.5">{t.duration}</div>
 </button>
 ))}
 </div>
 </div>

 <div className="mb-6">
 <label className="block text-sm font-medium text-surface-700 mb-2">Pricing tier</label>
 <div className="space-y-3">
 {marriagePricingTiers.map((t) => (
 <label
 key={t.slug}
 className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
 tier === t.slug
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <input
 type="radio"
 checked={tier === t.slug}
 onChange={() => setTier(t.slug)}
 className="sr-only"
 />
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="font-bold text-surface-800">{t.name}</div>
 <div className="text-xs text-surface-500 mt-0.5">
 {t.pandits} pandit{t.pandits > 1 ? 's' : ''} · {t.duration}
 </div>
 </div>
 <div className="text-xl font-bold text-surface-800">
 ₹{t.price.toLocaleString('en-IN')}
 </div>
 </div>
 </label>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Add-ons <span className="text-surface-400 font-normal">(₹2,500 each)</span>
 </label>
 <div className="grid sm:grid-cols-2 gap-2">
 {marriageAddOns.map((a) => (
 <label
 key={a}
 className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
 addOns.includes(a)
 ? 'border-saffron-500 bg-saffron-50'
 : 'border-[var(--color-border)] bg-white hover:border-saffron-300'
 }`}
 >
 <input
 type="checkbox"
 checked={addOns.includes(a)}
 onChange={() => toggleAddOn(a)}
 className="mt-0.5"
 />
 <span className="text-surface-700">{a}</span>
 </label>
 ))}
 </div>
 </div>
 </div>
 )}

 {step === 3 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Select your wedding pandit</h2>
 <p className="text-sm text-surface-500 mb-6">{weddingPandits.length} Vedic-certified officiants.</p>

 <div className="space-y-3">
 {weddingPandits.map((p) => (
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
 checked={panditId === p.id}
 onChange={() => setPanditId(p.id)}
 className="sr-only"
 />
 <div
 className="w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
 style={{ background: p.avatarBg }}
 >
 {p.initials}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-start gap-1.5">
 <div className="font-semibold text-surface-800">{p.name}</div>
 <BadgeCheck className="w-4 h-4 text-tulsi-green flex-shrink-0 mt-0.5" />
 </div>
 <div className="text-xs text-surface-500 mt-0.5">{p.title}</div>
 <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
 <span className="flex items-center gap-1">
 <Star className="w-3 h-3 text-temple-gold fill-temple-gold" />
 <span className="font-semibold">{p.rating}</span>
 </span>
 <span className="text-surface-300">·</span>
 <span className="text-surface-500">{p.weddingsPerformed}+ weddings</span>
 <span className="text-surface-300">·</span>
 <span className="text-surface-500">{p.city}</span>
 </div>
 <div className="text-xs text-surface-500 mt-1">
 Languages: {p.languages.slice(0, 4).join(', ')}
 </div>
 </div>
 <div className="text-right flex-shrink-0">
 <div className="text-xs text-surface-400">from</div>
 <div className="font-bold text-surface-800 text-sm">
 ₹{(p.pricing.marriage?.basic ?? 0).toLocaleString('en-IN')}
 </div>
 </div>
 </label>
 ))}
 </div>
 </div>
 )}

 {step === 4 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Venue & details</h2>
 <p className="text-sm text-surface-500 mb-6">Where and how the ceremony unfolds.</p>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-2">Venue type</label>
 <div className="grid grid-cols-3 gap-2">
 {([
 { id: 'home', label: 'Home' },
 { id: 'banquet', label: 'Banquet Hall' },
 { id: 'farmhouse', label: 'Farm House' },
 ] as const).map((v) => (
 <button
 key={v.id}
 type="button"
 onClick={() => setVenueType(v.id)}
 className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${
 venueType === v.id
 ? 'border-saffron-500 bg-saffron-50 text-saffron-700'
 : 'border-[var(--color-border)] bg-white text-surface-700 hover:border-saffron-300'
 }`}
 >
 {v.label}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Venue address</label>
 <textarea
 value={venueAddress}
 onChange={(e) => setVenueAddress(e.target.value)}
 rows={3}
 placeholder="Complete address"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">City</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="Delhi"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Expected guests</label>
 <input
 type="text"
 value={guestCount}
 onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ''))}
 placeholder="e.g. 250"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Contact phone (bride/groom side)
 </label>
 <input
 type="tel"
 value={brideContact}
 onChange={(e) => setBrideContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
 placeholder="10-digit mobile"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Language for narration
 </label>
 <select
 value={language}
 onChange={(e) => setLanguage(e.target.value)}
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 <option>Hindi + English</option>
 <option>Sanskrit + English</option>
 <option>Tamil + English</option>
 <option>Telugu + English</option>
 <option>Marathi + English</option>
 <option>Bengali + English</option>
 <option>Gujarati + English</option>
 <option>Punjabi + English</option>
 <option>Sanskrit only (traditional)</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Special traditions or customs <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <textarea
 value={traditions}
 onChange={(e) => setTraditions(e.target.value)}
 rows={3}
 placeholder="e.g. Kashi Yatra, Oonjal, specific family rituals, inter-faith considerations"
 className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
 />
 </div>
 </div>
 </div>
 )}

 {step === 5 && (
 <div>
 <h2 className="text-xl font-bold text-surface-800 mb-1">Review & pay</h2>
 <p className="text-sm text-surface-500 mb-6">Confirm details to complete your booking.</p>

 <div className="space-y-3">
 <Row label="Couple" value={`${brideName} & ${groomName}`} />
 <Row label="Wedding date" value={weddingDate} />
 {muhuratTime && <Row label="Muhurat" value={muhuratTime} />}
 <Row label="Tradition" value={marriageTypes.find((t) => t.slug === ceremonyType)?.name ?? ''} />
 <Row label="Tier" value={selectedTier?.name ?? ''} />
 <Row label="Pandit" value={selectedPandit?.name ?? ''} />
 <Row label="Venue" value={`${venueType.charAt(0).toUpperCase() + venueType.slice(1)} — ${venueAddress}, ${city}`} />
 {guestCount && <Row label="Guests" value={guestCount} />}
 <Row label="Narration" value={language} />
 <Row label="Contact" value={brideContact} />
 {addOns.length > 0 && <Row label="Add-ons" value={`${addOns.length} selected`} />}
 {traditions && <Row label="Special notes" value={traditions} />}
 </div>

 <div className="mt-6 pt-5 border-t border-[var(--color-divider)] space-y-2">
 <div className="flex justify-between text-sm text-surface-600">
 <span>{selectedTier?.name} tier</span>
 <span>₹{tierAmount.toLocaleString('en-IN')}</span>
 </div>
 {addOns.length > 0 && (
 <div className="flex justify-between text-sm text-surface-600">
 <span>{addOns.length} add-ons</span>
 <span>₹{addOnAmount.toLocaleString('en-IN')}</span>
 </div>
 )}
 <div className="flex justify-between text-sm text-surface-600">
 <span>GST (18%)</span>
 <span>₹{Math.round(total * 0.18).toLocaleString('en-IN')}</span>
 </div>
 <div className="flex justify-between text-lg font-bold text-surface-800 pt-2 border-t border-[var(--color-divider)]">
 <span>Total</span>
 <span>₹{Math.round(total * 1.18).toLocaleString('en-IN')}</span>
 </div>
 </div>

 <div className="mt-4 bg-sandal-cream border border-temple-gold/30 rounded-lg p-3 text-xs text-surface-700">
 <div className="font-semibold mb-1 flex items-center gap-1.5">
 <Sparkles className="w-3.5 h-3.5 text-temple-gold-dark" />
 Booking advance today
 </div>
 Pay 25% now (₹{Math.round(total * 1.18 * 0.25).toLocaleString('en-IN')}). Remaining on wedding day after ceremony begins.
 </div>

 <button
 onClick={handlePay}
 disabled={paying}
 className="w-full mt-5 py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
 style={{ background: 'var(--color-primary)' }}
 >
 {paying ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Processing advance...
 </>
 ) : (
 <>
 <Lock className="w-4 h-4" />
 Pay advance ₹{Math.round(total * 1.18 * 0.25).toLocaleString('en-IN')}
 </>
 )}
 </button>
 <div className="mt-3 flex items-center justify-center gap-2 text-xs text-surface-500">
 <Shield className="w-3.5 h-3.5" />
 Secured by Razorpay
 </div>
 </div>
 )}

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
 className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: 'var(--color-primary)' }}
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

 {/* Sidebar */}
 <aside className="lg:sticky lg:top-24 lg:h-fit space-y-4">
 <div className="bg-white border border-[var(--color-border)] rounded-xl p-5">
 <h3 className="font-bold text-surface-800 mb-3 flex items-center gap-2">
 <Heart className="w-4 h-4 text-vermillion-500" />
 Wedding summary
 </h3>
 <div className="space-y-2.5 text-sm">
 {brideName && groomName && (
 <div className="flex justify-between">
 <span className="text-surface-500">Couple</span>
 <span className="font-medium text-surface-800 text-right">
 {brideName || 'Bride'} &amp; {groomName || 'Groom'}
 </span>
 </div>
 )}
 <div className="flex justify-between">
 <span className="text-surface-500">Tier</span>
 <span className="font-medium text-surface-800">{selectedTier?.name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-surface-500">Duration</span>
 <span className="font-medium text-surface-800">{selectedTier?.duration}</span>
 </div>
 {selectedPandit && (
 <div className="flex justify-between">
 <span className="text-surface-500">Pandit</span>
 <span className="font-medium text-surface-800 text-right">{selectedPandit.name}</span>
 </div>
 )}
 {addOns.length > 0 && (
 <div className="flex justify-between">
 <span className="text-surface-500">Add-ons</span>
 <span className="font-medium text-surface-800">{addOns.length}</span>
 </div>
 )}
 </div>
 <div className="mt-4 pt-4 border-t border-[var(--color-divider)]">
 <div className="flex justify-between items-baseline">
 <span className="text-sm text-surface-500">Amount</span>
 <span className="text-xl font-bold text-surface-800">
 ₹{total.toLocaleString('en-IN')}
 </span>
 </div>
 <div className="text-xs text-surface-400 text-right mt-0.5">+ GST</div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-vermillion-500/10 to-saffron-500/5 border border-vermillion-500/20 rounded-xl p-5">
 <h4 className="font-bold text-surface-800 text-sm flex items-center gap-2 mb-2">
 <Users className="w-4 h-4 text-vermillion-600" />
 What happens next
 </h4>
 <ul className="space-y-2 text-xs text-surface-700">
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Coordinator calls within 2 hours
 </li>
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Muhurat consultation scheduled
 </li>
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Rite-by-rite walkthrough 2 weeks before
 </li>
 <li className="flex gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
 Venue visit by pandit 1 day before
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
