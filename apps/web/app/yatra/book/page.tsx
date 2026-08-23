'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
 ChevronLeft,
 ChevronRight,
 Check,
 Calendar,
 Users,
 MapPin,
 Plane,
 Flame,
 Heart,
 Shield,
 Upload,
 CreditCard,
 Loader2,
 CheckCircle2,
} from 'lucide-react';
import { getYatraBySlug, formatINR } from '../../../lib/yatra-data';
import { DateInput } from '../../../components/ui/DateInput';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
type Traveler = {
 name: string;
 age: string;
 gender: 'male' | 'female' | 'other';
 idProof: string;
};

type BookingData = {
 // Step 1
 startDate: string;
 pickupCity: string;
 travelersCount: number;
 // Step 2
 packageTier: 'economy' | 'standard' | 'premium';
 // Step 3
 addOns: {
 helicopter: boolean;
 specialPuja: boolean;
 companion: boolean;
 insurance: boolean;
 };
 companionDays: number;
 // Step 4
 travelers: Traveler[];
 // Step 5 — buyer contact for inquiry / invoice
 buyerEmail: string;
 buyerPhone: string;
};

const STEPS = ['Trip', 'Package', 'Add-ons', 'Travelers', 'Review'];

function BookYatraInner() {
 const searchParams = useSearchParams();
 const params = { slug: (searchParams.get('slug') ?? '') as string };
 const router = useRouter();
 const yatra = getYatraBySlug(params.slug);

 const [step, setStep] = useState(1);
 const [data, setData] = useState<BookingData>(() => ({
 startDate: '',
 pickupCity: 'Delhi',
 travelersCount: 2,
 packageTier: (searchParams.get('tier') as 'economy' | 'standard' | 'premium') || 'standard',
 addOns: { helicopter: false, specialPuja: false, companion: false, insurance: true },
 companionDays: yatra?.durationDays ?? 7,
 travelers: [
 { name: '', age: '', gender: 'male', idProof: '' },
 { name: '', age: '', gender: 'female', idProof: '' },
 ],
 buyerEmail: '',
 buyerPhone: '',
 }));
 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [referenceId, setReferenceId] = useState<string | null>(null);
 const [buyerName, setBuyerName] = useState('');
 const [submitError, setSubmitError] = useState<string | null>(null);

 // Persist to localStorage
 useEffect(() => {
 if (!yatra) return;
 const key = `yatra-booking-${yatra.slug}`;
 try {
 const saved = localStorage.getItem(key);
 if (saved) {
 const parsed = JSON.parse(saved);
 setData((d) => ({ ...d, ...parsed }));
 }
 } catch {}
 }, [yatra]);

 useEffect(() => {
 if (!yatra) return;
 try {
 localStorage.setItem(`yatra-booking-${yatra.slug}`, JSON.stringify(data));
 } catch {}
 }, [data, yatra]);

 // Sync travelers array with count
 useEffect(() => {
 setData((d) => {
 if (d.travelers.length === d.travelersCount) return d;
 const nextTravelers = [...d.travelers];
 while (nextTravelers.length < d.travelersCount) {
 nextTravelers.push({ name: '', age: '', gender: 'male', idProof: '' });
 }
 while (nextTravelers.length > d.travelersCount) nextTravelers.pop();
 return { ...d, travelers: nextTravelers };
 });
 }, [data.travelersCount]);

 const selectedPackage = useMemo(() => yatra?.packages.find((p) => p.tier === data.packageTier), [yatra, data.packageTier]);

 const priceBreakdown = useMemo(() => {
 if (!selectedPackage) return { lines: [], total: 0 };
 const lines: { label: string; amount: number }[] = [];
 const base = selectedPackage.price * data.travelersCount;
 lines.push({ label: `${selectedPackage.name} × ${data.travelersCount} travelers`, amount: base });
 if (data.addOns.helicopter) {
 const heli = 8000 * data.travelersCount;
 lines.push({ label: `Helicopter × ${data.travelersCount}`, amount: heli });
 }
 if (data.addOns.specialPuja) {
 lines.push({ label: 'Special puja at temple', amount: 2100 });
 }
 if (data.addOns.companion) {
 const comp = 3500 * data.companionDays;
 lines.push({ label: `Travel companion × ${data.companionDays} days`, amount: comp });
 }
 if (data.addOns.insurance) {
 const ins = 500 * data.travelersCount;
 lines.push({ label: `Travel insurance × ${data.travelersCount}`, amount: ins });
 }
 const subtotal = lines.reduce((s, l) => s + l.amount, 0);
 const gst = Math.round(subtotal * 0.05);
 lines.push({ label: 'GST (5%)', amount: gst });
 return { lines, total: subtotal + gst };
 }, [selectedPackage, data]);

 if (!yatra) {
 return (
 <div className="min-h-[60vh] flex items-center justify-center">
 <div className="text-center">
 <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>Yatra not found.</p>
 <Link href="/yatra" className="text-sm" style={{ color: 'var(--color-primary)' }}>Back to yatras</Link>
 </div>
 </div>
 );
 }

 const canContinue = (() => {
 if (step === 1) return data.startDate.length > 0 && data.pickupCity.length > 0 && data.travelersCount > 0;
 if (step === 2) return !!data.packageTier;
 if (step === 3) return true;
 if (step === 4) return data.travelers.every((t) => t.name.length > 1 && Number(t.age) >= 5);
 return true;
 })();

 const canSubmitInquiry = buyerName.trim().length > 1 && /.+@.+\..+/.test(data.buyerEmail);

 async function handlePay() {
 if (!yatra) return;
 const currentYatra = yatra;
 setSubmitting(true);
 setSubmitError(null);

 const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.darshya.online';
 const totalInr = priceBreakdown.total;

 // COM-08: a hardcoded USD conversion at a fixed 83:1 rate was computed here
 // and posted alongside the real quote — a leftover of the removed Stripe/USD
 // path. Nothing reads it (the inquiry schema defaults that field to 0) and the
 // rate was already stale, so it was a fabricated number travelling with a real
 // one. Dropped.
 const payload = {
 yatraSlug: currentYatra.slug,
 yatraTitle: currentYatra.title,
 packageTier: data.packageTier,
 startDate: data.startDate,
 pickupCity: data.pickupCity,
 travelersCount: data.travelersCount,
 travelers: data.travelers.map((t) => ({ name: t.name, age: t.age, gender: t.gender })),
 totalInr,
 buyer: {
 name: buyerName,
 email: data.buyerEmail,
 phone: data.buyerPhone,
 country: 'India',
 },
 notes: `Add-ons: ${Object.entries(data.addOns).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`,
 };

 try {
 const res = await fetch(`${API_BASE}/api/v1/yatra-inquiry/`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const json = (await res.json()) as { referenceId: string; ok: boolean };

 try {
 const existing = JSON.parse(localStorage.getItem('yatra-inquiries') || '[]');
 existing.push({
 referenceId: json.referenceId,
 yatraSlug: currentYatra.slug,
 yatraTitle: currentYatra.title,
 startDate: data.startDate,
 travelers: data.travelersCount,
 packageTier: data.packageTier,
 total: totalInr,
 status: 'inquiry-received',
 createdAt: new Date().toISOString(),
 });
 localStorage.setItem('yatra-inquiries', JSON.stringify(existing));
 localStorage.removeItem(`yatra-booking-${currentYatra.slug}`);
 } catch {}

 setReferenceId(json.referenceId);
 setSubmitted(true);
 } catch (err) {
 setSubmitError('Could not reach our yatra desk. Email yatra@darshya.online directly or try again in a minute.');
 } finally {
 setSubmitting(false);
 }
 }

 if (submitted) {
 return (
 <div className="min-h-[80vh] flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
 <div className="max-w-md text-center">
 <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-primary-highlight)' }}>
 <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
 </div>
 <h1 className={`${H1.portal} mb-2`}>Inquiry received</h1>
 <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Our yatra desk will confirm hotel + transport availability for {yatra.title} and email your final invoice within 24 hours.
 </p>
 <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Reference ID</p>
 <p className="text-lg font-mono font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{referenceId ?? '—'}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Quote</p>
 <p className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(priceBreakdown.total)}</p>
 </div>
 <div className="flex items-center justify-center gap-3">
 <Link href="/profile/yatra-bookings" className={buttonClass('primary', 'md')}>
 View my inquiries
 </Link>
 <Link href="/yatra" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 Browse more
 </Link>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div style={{ background: 'var(--color-bg)' }}>
 {/* Header */}
 <div className="border-b" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-surface)' }}>
 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
 <Link href={`/yatra/${yatra.slug}`} className="inline-flex items-center gap-1.5 text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
 <ChevronLeft className="w-3.5 h-3.5" /> Back to yatra
 </Link>
 <h1 className={H1.portal}>
 Book {yatra.title}
 </h1>

 {/* Stepper */}
 <div className="mt-5 flex items-center gap-2">
 {STEPS.map((label, i) => {
 const n = i + 1;
 const active = n === step;
 const done = n < step;
 return (
 <div key={label} className="flex items-center gap-2 flex-1">
 <div
 className="flex items-center gap-1.5 text-xs font-medium flex-1"
 style={{ color: active ? 'var(--color-primary)' : done ? 'var(--color-status-success)' : 'var(--color-text-faint)' }}
 >
 <div
 className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
 style={{
 background: active ? 'var(--color-primary)' : done ? 'var(--color-status-success)' : 'var(--color-surface-offset)',
 color: active || done ? '#fff' : 'var(--color-text-faint)',
 }}
 >
 {done ? <Check className="w-3 h-3" /> : n}
 </div>
 <span className="hidden sm:inline">{label}</span>
 </div>
 {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: n < step ? 'var(--color-status-success)' : 'var(--color-divider)' }} />}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="grid md:grid-cols-3 gap-6">
 {/* Main form column */}
 <div className="md:col-span-2">
 {/* ─── Step 1: Trip details ─── */}
 {step === 1 && (
 <div className="space-y-5 rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div>
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Trip details</h2>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>When would you like to travel?</p>
 </div>

 <div>
 <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text)' }}>Start date</label>
 <div className="relative">
 <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
 <DateInput
 value={data.startDate}
 onChange={(v) => setData({ ...data, startDate: v })}
 />
 </div>
 <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>Best time: {yatra.bestTime}</p>
 </div>

 <div>
 <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text)' }}>Number of travelers</label>
 <div className="flex items-center gap-3">
 <button
 onClick={() => setData({ ...data, travelersCount: Math.max(1, data.travelersCount - 1) })}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >-</button>
 <span className="text-sm font-semibold min-w-8 text-center" style={{ color: 'var(--color-text)' }}>{data.travelersCount}</span>
 <button
 onClick={() => setData({ ...data, travelersCount: Math.min(12, data.travelersCount + 1) })}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >+</button>
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>(max 12 per booking)</span>
 </div>
 </div>

 <div>
 <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text)' }}>Pickup city</label>
 <select
 value={data.pickupCity}
 onChange={(e) => setData({ ...data, pickupCity: e.target.value })}
 className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 >
 {['Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'].map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 </div>
 )}

 {/* ─── Step 2: Package selection ─── */}
 {step === 2 && (
 <div className="space-y-3">
 <div className="mb-3">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Choose your package</h2>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>All packages include permits and tour manager.</p>
 </div>
 {yatra.packages.map((pkg) => (
 <button
 key={pkg.tier}
 onClick={() => setData({ ...data, packageTier: pkg.tier })}
 className="w-full text-left rounded-xl p-4 transition-all"
 style={{
 background: data.packageTier === pkg.tier ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
 border: `2px solid ${data.packageTier === pkg.tier ? 'var(--color-primary)' : 'var(--color-border)'}`,
 }}
 >
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-primary)' }}>{pkg.tier}</p>
 <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text)' }}>{pkg.name}</h3>
 <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{pkg.tagline}</p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{formatINR(pkg.price)}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>per person</p>
 </div>
 </div>
 </button>
 ))}
 </div>
 )}

 {/* ─── Step 3: Add-ons ─── */}
 {step === 3 && (
 <div className="space-y-3">
 <div className="mb-3">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Enhance your journey</h2>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Optional add-ons to make your yatra smoother.</p>
 </div>

 {yatra.helicopterAvailable && (
 <AddOnRow
 icon={Plane}
 title="Helicopter service"
 desc="Skip long treks. Applicable for Kedarnath/Vaishno Devi/Amarnath."
 price={`+${formatINR(8000)} / person`}
 active={data.addOns.helicopter}
 onToggle={() => setData({ ...data, addOns: { ...data.addOns, helicopter: !data.addOns.helicopter } })}
 />
 )}

 <AddOnRow
 icon={Flame}
 title="Special puja at temple"
 desc="Sankalpa with your name & gotra by appointed priest."
 price={`+${formatINR(2100)}`}
 active={data.addOns.specialPuja}
 onToggle={() => setData({ ...data, addOns: { ...data.addOns, specialPuja: !data.addOns.specialPuja } })}
 />

 <AddOnRow
 icon={Heart}
 title="Travel companion"
 desc="On request. A companion assists elderly travellers with mobility, medicine and logistics — our advisor confirms availability before your booking is held."
 price={`+${formatINR(3500)} / day`}
 active={data.addOns.companion}
 onToggle={() => setData({ ...data, addOns: { ...data.addOns, companion: !data.addOns.companion } })}
 />
 {data.addOns.companion && (
 <div className="ml-10 rounded-lg p-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-text)' }}>Companion required for (days)</label>
 <div className="flex items-center gap-3">
 <button onClick={() => setData({ ...data, companionDays: Math.max(1, data.companionDays - 1) })} className="w-7 h-7 rounded-md text-sm" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>-</button>
 <span className="text-sm font-semibold min-w-6 text-center" style={{ color: 'var(--color-text)' }}>{data.companionDays}</span>
 <button onClick={() => setData({ ...data, companionDays: Math.min(yatra.durationDays, data.companionDays + 1) })} className="w-7 h-7 rounded-md text-sm" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>+</button>
 <Link href="/yatra/companion" className="text-xs ml-auto" style={{ color: 'var(--color-primary)' }}>Choose companion →</Link>
 </div>
 </div>
 )}

 <AddOnRow
 icon={Shield}
 title="Travel insurance"
 desc="Medical + trip cancellation cover."
 price={`+${formatINR(500)} / person`}
 active={data.addOns.insurance}
 onToggle={() => setData({ ...data, addOns: { ...data.addOns, insurance: !data.addOns.insurance } })}
 />
 </div>
 )}

 {/* ─── Step 4: Travelers ─── */}
 {step === 4 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Traveler details</h2>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>As per government ID. Required for permits & registration.</p>
 </div>
 {data.travelers.map((t, i) => (
 <div key={i} className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Traveler {i + 1}</p>
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Full name</label>
 <input
 value={t.name}
 onChange={(e) => {
 const next = [...data.travelers];
 next[i] = { ...t, name: e.target.value };
 setData({ ...data, travelers: next });
 }}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 placeholder="As per ID"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Age</label>
 <input
 type="number"
 value={t.age}
 onChange={(e) => {
 const next = [...data.travelers];
 next[i] = { ...t, age: e.target.value };
 setData({ ...data, travelers: next });
 }}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Gender</label>
 <select
 value={t.gender}
 onChange={(e) => {
 const next = [...data.travelers];
 next[i] = { ...t, gender: e.target.value as 'male' | 'female' | 'other' };
 setData({ ...data, travelers: next });
 }}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 >
 <option value="male">Male</option>
 <option value="female">Female</option>
 <option value="other">Other</option>
 </select>
 </div>
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>ID proof (Aadhaar/Passport)</label>
 <div className="flex items-center gap-2">
 <input
 value={t.idProof}
 onChange={(e) => {
 const next = [...data.travelers];
 next[i] = { ...t, idProof: e.target.value };
 setData({ ...data, travelers: next });
 }}
 className="flex-1 px-3 py-2 text-xs rounded-lg focus:outline-none"
 placeholder="Last 4 digits"
 maxLength={12}
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 <button type="button" className="px-3 py-2 text-xs rounded-lg inline-flex items-center gap-1.5" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 <Upload className="w-3 h-3" /> Upload
 </button>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* ─── Step 5: Review & Pay ─── */}
 {step === 5 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Review & pay</h2>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Verify details before payment.</p>
 </div>
 <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Trip summary</p>
 <div className="space-y-2 text-xs">
 <Row label="Yatra" value={yatra.title} />
 <Row label="Start date" value={data.startDate || '—'} />
 <Row label="Travelers" value={`${data.travelersCount} adults`} />
 <Row label="Pickup" value={data.pickupCity} />
 <Row label="Package" value={selectedPackage?.name ?? '—'} />
 </div>
 </div>

 <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Price breakdown</p>
 <div className="space-y-2 text-xs">
 {priceBreakdown.lines.map((l, i) => (
 <div key={i} className="flex items-center justify-between">
 <span style={{ color: 'var(--color-text-muted)' }}>{l.label}</span>
 <span className="font-medium" style={{ color: 'var(--color-text)' }}>{formatINR(l.amount)}</span>
 </div>
 ))}
 <div className="pt-2 mt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Total</span>
 <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{formatINR(priceBreakdown.total)}</span>
 </div>
 </div>
 </div>

 <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-primary)' }}>Your contact</p>
 <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
 Our yatra desk confirms hotel + transport availability and emails final invoice within 24h. No card needed now.
 </p>
 <div className="grid sm:grid-cols-2 gap-3">
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Your name</label>
 <input
 value={buyerName}
 onChange={(e) => setBuyerName(e.target.value)}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 placeholder="Full name"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
 <input
 type="email"
 value={data.buyerEmail}
 onChange={(e) => setData({ ...data, buyerEmail: e.target.value })}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 placeholder="you@example.com"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 <div className="sm:col-span-2">
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>Phone / WhatsApp (optional)</label>
 <input
 value={data.buyerPhone}
 onChange={(e) => setData({ ...data, buyerPhone: e.target.value })}
 className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
 placeholder="+91 ..."
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 </div>
 </div>

 <button
 onClick={handlePay}
 disabled={submitting || !canSubmitInquiry}
 className={buttonClass('primary', 'md', 'w-full btn-press')}
 >
 {submitting ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Sending inquiry...</>
 ) : (
 <><CreditCard className="w-4 h-4" /> Request booking · {formatINR(priceBreakdown.total)}</>
 )}
 </button>
 {submitError && (
 <p className="text-xs text-center" style={{ color: 'var(--color-status-danger, #b91c1c)' }}>{submitError}</p>
 )}
 <p className="text-xs text-center" style={{ color: 'var(--color-text-faint)' }}>
 Payment link emailed after our team confirms availability. No charge now.
 </p>
 </div>
 )}

 {/* Navigation */}
 <div className="mt-6 flex items-center justify-between">
 <button
 onClick={() => setStep(Math.max(1, step - 1))}
 disabled={step === 1}
 className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-40"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 <ChevronLeft className="w-3.5 h-3.5" /> Back
 </button>
 {step < 5 && (
 <button
 onClick={() => setStep(step + 1)}
 disabled={!canContinue}
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Continue <ChevronRight className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Sidebar summary */}
 <aside className="md:col-span-1 h-fit sticky top-20">
 <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="aspect-[16/10] overflow-hidden">
 <img width={640} height={400} src={yatra.heroImage} alt={yatra.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 </div>
 <div className="p-4">
 <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{yatra.title}</h3>
 <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {yatra.durationDays} days</span>
 <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {yatra.places.length} stops</span>
 </div>

 {selectedPackage && (
 <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-primary)' }}>{selectedPackage.tier}</p>
 <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{selectedPackage.name}</p>
 <div className="mt-3 flex items-center justify-between">
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Estimated total</span>
 <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>{formatINR(priceBreakdown.total)}</span>
 </div>
 <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>For {data.travelersCount} travelers, incl. GST</p>
 </div>
 )}

 <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
 <span>{data.travelersCount} {data.travelersCount === 1 ? 'traveler' : 'travelers'}</span>
 </div>
 </div>
 </div>
 </aside>
 </div>
 </div>
 </div>
 );
}

function AddOnRow({
 icon: Icon,
 title,
 desc,
 price,
 active,
 onToggle,
}: {
 icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
 title: string;
 desc: string;
 price: string;
 active: boolean;
 onToggle: () => void;
}) {
 return (
 <button
 onClick={onToggle}
 className="w-full text-left rounded-xl p-4 flex items-start gap-3 transition-all"
 style={{
 background: active ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
 border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
 }}
 >
 <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? 'var(--color-primary)' : 'var(--color-surface-offset)' }}>
 <Icon className="w-4 h-4" style={{ color: active ? '#fff' : 'var(--color-text-muted)' }} />
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between gap-2">
 <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
 <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>{price}</span>
 </div>
 <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
 </div>
 <div
 className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
 style={{
 background: active ? 'var(--color-primary)' : 'transparent',
 borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
 }}
 >
 {active && <Check className="w-3 h-3 text-white" />}
 </div>
 </button>
 );
}

function Row({ label, value }: { label: string; value: string }) {
 return (
 <div className="flex items-center justify-between">
 <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
 <span className="font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
 </div>
 );
}

export default function BookYatraPage() {
 return (
  <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#faf7f0]"><div className="text-surface-500">Loading…</div></div>}>
   <BookYatraInner />
  </Suspense>
 );
}
