'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
 ChevronLeft,
 ChevronRight,
 Check,
 Calendar,
 Users,
 Wallet,
 Car,
 Utensils,
 Accessibility,
 Sparkles,
 Loader2,
 CheckCircle2,
 ArrowRight,
 Compass,
 MapPin,
 Clock,
} from 'lucide-react';
import ScrollReveal from '../../../components/ScrollReveal';
import { sacredSites, formatINR } from '../../../lib/yatra-data';
import { DateInput } from '../../../components/ui/DateInput';
import { distanceHints } from '../../../lib/yatra-distance';

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
type PlanData = {
 destinations: string[]; // site ids
 startDate: string;
 endDate: string;
 adults: number;
 seniors: number;
 budget: 'economy' | 'standard' | 'premium';
 pace: 'relaxed' | 'moderate' | 'fast';
 transport: 'cab' | 'train' | 'mixed' | 'flights';
 stay: 'budget' | 'mid' | 'premium';
 specialNeeds: string[];
 notes: string;
};

const STEPS = ['Destinations', 'Dates', 'Travelers', 'Preferences', 'Special Needs', 'Review'];

const specialNeedsOptions = [
 'Elderly care (65+)',
 'Wheelchair access needed',
 'Vegetarian (Sattvic) only',
 'Jain dietary restrictions',
 'Diabetic-friendly meals',
 'Medical conditions — requires nurse',
 'Hindi-only group',
 'Prefer women-only companion',
];

export default function CustomPlanPage() {
 const [step, setStep] = useState(1);
 const [data, setData] = useState<PlanData>({
 destinations: [],
 startDate: '',
 endDate: '',
 adults: 2,
 seniors: 0,
 budget: 'standard',
 pace: 'moderate',
 transport: 'mixed',
 stay: 'mid',
 specialNeeds: [],
 notes: '',
 });
 const [lastAdded, setLastAdded] = useState<string | null>(null);
 const [generating, setGenerating] = useState(false);
 const [generated, setGenerated] = useState<{ days: { day: number; title: string; description: string; stops: string[] }[]; estimate: number } | null>(null);

 const siteById = useMemo(() => new Map(sacredSites.map((s) => [s.id, s])), []);

 const durationDays = useMemo(() => {
 if (!data.startDate || !data.endDate) return 0;
 const diff = Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
 return Math.max(1, diff + 1);
 }, [data.startDate, data.endDate]);

 function toggleDest(id: string) {
 setLastAdded(data.destinations.includes(id) ? null : id);
 setData((d) => ({
 ...d,
 destinations: d.destinations.includes(id) ? d.destinations.filter((x) => x !== id) : [...d.destinations, id],
 }));
 }

 // Straight-line hint for the site just added, against the ones already chosen.
 // Only for towns whose coordinates the repo really has; otherwise no hint.
 const distanceNote = useMemo(() => {
 const added = lastAdded ? siteById.get(lastAdded) : null;
 if (!added || !data.destinations.includes(added.id)) return '';
 const others = data.destinations.map((id) => siteById.get(id)).filter((x): x is NonNullable<typeof x> => !!x);
 const hints = distanceHints(added, others);
 if (hints.length === 0) return '';
 return `${added.name}: ` + hints.map((h) => (h.km < 10 ? `same town as ${h.fromName}` : `about ${h.km} km from ${h.fromName}`)).join(', ') + ' (straight-line; by road it is longer).';
 }, [lastAdded, data.destinations, siteById]);

 function toggleNeed(n: string) {
 setData((d) => ({
 ...d,
 specialNeeds: d.specialNeeds.includes(n) ? d.specialNeeds.filter((x) => x !== n) : [...d.specialNeeds, n],
 }));
 }

 // The itinerary and estimate are computed in the browser from the answers
 // above, so there is nothing to wait for. The old 1.8 s setTimeout was a
 // fake "AI is thinking" delay that made the quote feel like it lagged.
 function handleGenerate() {
 setGenerating(true);
 {
 const dests = data.destinations.map((id) => siteById.get(id)).filter(Boolean);
 const sitesPerDay = data.pace === 'relaxed' ? 0.5 : data.pace === 'moderate' ? 0.8 : 1.2;
 const days = Math.max(durationDays || Math.ceil(dests.length / sitesPerDay) + 2, 3);
 const itinerary: { day: number; title: string; description: string; stops: string[] }[] = [];

 itinerary.push({ day: 1, title: `Arrive ${dests[0]?.location ?? 'departure city'}`, description: 'Pickup from airport/railway, settle in, briefing with tour manager, evening aarti at local temple.', stops: ['Arrival', 'Hotel check-in'] });

 let destIdx = 0;
 for (let d = 2; d < days; d++) {
 if (destIdx >= dests.length) {
 itinerary.push({ day: d, title: 'Free day & local sightseeing', description: 'Rest, shopping for prasad & local darshan of secondary shrines.', stops: ['Free day'] });
 continue;
 }
 const chunk = Math.ceil(sitesPerDay);
 const picks = dests.slice(destIdx, destIdx + chunk);
 destIdx += chunk;
 if (picks.length === 0) continue;
 itinerary.push({
 day: d,
 title: picks.map((p) => p?.name).join(' & '),
 description: `Morning darshan at ${picks[0]?.name} (${picks[0]?.deity}). ${picks[1] ? `Afternoon drive to ${picks[1]?.name}.` : 'Afternoon local exploration and rest.'} Evening aarti.`,
 stops: picks.map((p) => `${p?.name}, ${p?.location}`),
 });
 }
 itinerary.push({ day: days, title: 'Return journey', description: 'Morning darshan at final site (if any), transfer to airport/station.', stops: ['Departure'] });

 const perPerson = data.budget === 'economy' ? 3800 : data.budget === 'standard' ? 7200 : 15000;
 const base = perPerson * days * (data.adults + data.seniors);
 setGenerated({ days: itinerary.slice(0, days), estimate: base });
 setGenerating(false);
 setStep(7);
 if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
 }
 }

 const canContinue = (() => {
 if (step === 1) return data.destinations.length >= 1;
 if (step === 2) return data.startDate.length > 0 && data.endDate.length > 0 && data.endDate >= data.startDate;
 if (step === 3) return data.adults + data.seniors > 0;
 return true;
 })();

 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>
 {/* Header */}
 <div className="border-b" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
 <Link href="/yatra" className="inline-flex items-center gap-1.5 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
 <ChevronLeft className="w-3.5 h-3.5" /> Back to yatras
 </Link>
 <div className="flex items-center gap-2 mb-1">
 <Compass className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Custom Trip Planner</p>
 </div>
 <h1 className={H1.portal}>
 Design your own sacred journey
 </h1>
 <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
 Tell us your preferences — we&apos;ll generate a realistic itinerary and quote in minutes.
 </p>

 {/* Stepper */}
 {step <= 6 && (
 <div className="mt-5 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
 {STEPS.map((label, i) => {
 const n = i + 1;
 const active = n === step;
 const done = n < step;
 return (
 <div key={label} className="flex items-center gap-1.5 shrink-0">
 <div
 className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
 style={{
 background: active ? 'var(--color-primary)' : done ? 'var(--color-status-success)' : 'var(--color-surface-offset)',
 color: active || done ? '#fff' : 'var(--color-text-faint)',
 }}
 >
 {done ? <Check className="w-3 h-3" /> : n}
 </div>
 <span className="text-xs font-medium" style={{ color: active ? 'var(--color-primary)' : done ? 'var(--color-status-success)' : 'var(--color-text-faint)' }}>{label}</span>
 {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: 'var(--color-text-faint)' }} />}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* ─── Step 1: Destinations ─── */}
 {step === 1 && (
 <div>
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Choose your destinations</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Select all sacred sites you want to include. Min. 1, max. 15.</p>

 <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
 {sacredSites.map((s) => {
 const selected = data.destinations.includes(s.id);
 return (
 <button
 key={s.id}
 onClick={() => toggleDest(s.id)}
 className="text-left rounded-lg p-3 transition-all"
 style={{
 background: selected ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
 border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
 }}
 >
 <div className="flex items-center justify-between mb-0.5">
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{s.name}</p>
 {selected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />}
 </div>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.location}, {s.state}</p>
 <p className="text-xs mt-1" style={{ color: 'var(--color-primary)' }}>{s.deity}</p>
 </button>
 );
 })}
 </div>
 {distanceNote && (
 <p className="text-xs mt-4 inline-flex items-center gap-1.5" style={{ color: 'var(--color-text)' }} aria-live="polite">
 <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
 {distanceNote}
 </p>
 )}
 <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
 Selected: <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{data.destinations.length}</span> sites
 </p>
 </div>
 )}

 {/* ─── Step 2: Dates ─── */}
 {step === 2 && (
 <div className="max-w-lg">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Travel dates</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>When would you like to travel?</p>
 <div className="grid sm:grid-cols-2 gap-3 mb-4">
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text)' }}>Start date</label>
 <DateInput
 value={data.startDate}
 onChange={(v) => setData({ ...data, startDate: v })}
 />
 </div>
 <div>
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text)' }}>End date</label>
 <DateInput
 value={data.endDate}
 onChange={(v) => setData({ ...data, endDate: v })}
 />
 </div>
 </div>
 {durationDays > 0 && (
 <div className="rounded-lg p-3 inline-flex items-center gap-2 text-xs" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
 <Clock className="w-3.5 h-3.5" />
 Duration: <span className="font-semibold">{durationDays} days</span>
 </div>
 )}
 </div>
 )}

 {/* ─── Step 3: Travelers ─── */}
 {step === 3 && (
 <div className="max-w-lg">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Who&apos;s traveling?</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>We&apos;ll tailor the pace and stays accordingly.</p>
 <div className="space-y-4">
 <CounterRow label="Adults (18-64)" value={data.adults} onChange={(v) => setData({ ...data, adults: v })} />
 <CounterRow label="Seniors (65+)" value={data.seniors} onChange={(v) => setData({ ...data, seniors: v })} hint="Recommend pace = relaxed, premium stays, and companion booking" />
 </div>
 </div>
 )}

 {/* ─── Step 4: Preferences ─── */}
 {step === 4 && (
 <div>
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Preferences</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Helps us match the right package.</p>

 <div className="space-y-5 max-w-2xl">
 <Section title="Budget" icon={Wallet}>
 <div className="grid grid-cols-3 gap-2">
 {(['economy', 'standard', 'premium'] as const).map((b) => (
 <ChipButton key={b} active={data.budget === b} onClick={() => setData({ ...data, budget: b })} label={b} />
 ))}
 </div>
 </Section>

 <Section title="Pace" icon={Clock}>
 <div className="grid grid-cols-3 gap-2">
 {(['relaxed', 'moderate', 'fast'] as const).map((p) => (
 <ChipButton key={p} active={data.pace === p} onClick={() => setData({ ...data, pace: p })} label={p} />
 ))}
 </div>
 </Section>

 <Section title="Transport" icon={Car}>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {(['cab', 'train', 'mixed', 'flights'] as const).map((t) => (
 <ChipButton key={t} active={data.transport === t} onClick={() => setData({ ...data, transport: t })} label={t} />
 ))}
 </div>
 </Section>

 <Section title="Stay type" icon={MapPin}>
 <div className="grid grid-cols-3 gap-2">
 {(['budget', 'mid', 'premium'] as const).map((s) => (
 <ChipButton key={s} active={data.stay === s} onClick={() => setData({ ...data, stay: s })} label={s} />
 ))}
 </div>
 </Section>
 </div>
 </div>
 )}

 {/* ─── Step 5: Special needs ─── */}
 {step === 5 && (
 <div className="max-w-2xl">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Special requirements</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Select all that apply. Our team will plan accordingly.</p>
 <div className="grid sm:grid-cols-2 gap-2">
 {specialNeedsOptions.map((opt) => {
 const sel = data.specialNeeds.includes(opt);
 return (
 <button
 key={opt}
 onClick={() => toggleNeed(opt)}
 className="text-left rounded-lg p-3 flex items-center gap-2 transition-all"
 style={{
 background: sel ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
 border: `2px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`,
 }}
 >
 <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0" style={{ background: sel ? 'var(--color-primary)' : 'transparent', borderColor: sel ? 'var(--color-primary)' : 'var(--color-border)' }}>
 {sel && <Check className="w-2.5 h-2.5 text-white" />}
 </div>
 <span className="text-xs" style={{ color: 'var(--color-text)' }}>{opt}</span>
 </button>
 );
 })}
 </div>
 <div className="mt-5">
 <label className="text-xs block mb-1" style={{ color: 'var(--color-text)' }}>Anything else we should know?</label>
 <textarea
 value={data.notes}
 onChange={(e) => setData({ ...data, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
 placeholder="e.g., Gotra for sankalpa pujas, specific temples with priority, anniversary date"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 />
 </div>
 </div>
 )}

 {/* ─── Step 6: Review before generating ─── */}
 {step === 6 && (
 <div className="max-w-3xl">
 <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Review & generate</h2>
 <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Confirm your preferences. Our AI will generate a sample itinerary.</p>

 <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="grid sm:grid-cols-2 gap-4 text-xs">
 <ReviewRow label="Destinations" value={`${data.destinations.length} sites`} />
 <ReviewRow label="Duration" value={`${durationDays} days`} />
 <ReviewRow label="Travelers" value={`${data.adults} adults${data.seniors > 0 ? `, ${data.seniors} seniors` : ''}`} />
 <ReviewRow label="Budget" value={data.budget} />
 <ReviewRow label="Pace" value={data.pace} />
 <ReviewRow label="Transport" value={data.transport} />
 <ReviewRow label="Stay" value={data.stay} />
 <ReviewRow label="Special needs" value={data.specialNeeds.length > 0 ? `${data.specialNeeds.length} selected` : 'None'} />
 </div>
 </div>

 <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--color-primary-highlight)', border: '1px solid var(--color-primary)' }}>
 <p className="text-xs" style={{ color: 'var(--color-text)' }}>
 <Sparkles className="w-3.5 h-3.5 inline mr-1" style={{ color: 'var(--color-primary)' }} />
 We use your answers to generate a realistic day-by-day itinerary and ballpark quote. A Darshya advisor will then refine and finalize your trip.
 </p>
 </div>

 <button
 onClick={handleGenerate}
 disabled={generating}
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 {generating ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Generating itinerary...</>
 ) : (
 <><Sparkles className="w-4 h-4" /> Generate My Itinerary</>
 )}
 </button>
 </div>
 )}

 {/* ─── Step 7: Generated itinerary ─── */}
 {step === 7 && generated && (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-status-success)' }} />
 <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-status-success)' }}>Itinerary ready</p>
 </div>
 <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Your personalized {durationDays}-day yatra
 </h2>
 <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Covering {data.destinations.length} sacred sites across India. Refine with our advisor.
 </p>

 <div className="grid md:grid-cols-3 gap-6">
 <div className="md:col-span-2">
 <div className="relative">
 <div className="absolute left-5 top-2 bottom-2 w-px" style={{ background: 'var(--color-divider)' }} />
 <div className="space-y-3">
 {generated.days.map((d) => (
 <div key={d.day} className="relative pl-14">
 <div className="absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
 D{d.day}
 </div>
 <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{d.title}</h3>
 <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-muted)' }}>{d.description}</p>
 <div className="flex flex-wrap gap-1">
 {d.stops.map((s, i) => (
 <span key={i} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>{s}</span>
 ))}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <aside className="h-fit sticky top-20">
 <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Estimated quote</p>
 <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>{formatINR(generated.estimate)}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>For {data.adults + data.seniors} travelers · {durationDays} days · {data.budget} tier</p>

 <div className="mt-4 pt-4 space-y-2 text-xs" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <p style={{ color: 'var(--color-text-muted)' }}>This is a preliminary estimate generated on this page from the choices you made. It is not a quote, and it is not sent to us unless you email it. Stays, transport and inclusions are confirmed by our team when you enquire.</p>
 </div>

 <a
 href={`mailto:care@darshya.online?subject=${encodeURIComponent('Yatra quote request')}&body=${encodeURIComponent(`I would like a quote for a yatra.\n\nTravelers: ${data.adults + data.seniors}\nDuration: ${durationDays} days\nBudget tier: ${data.budget}\nPreliminary estimate shown on the page: ${formatINR(generated.estimate)}\n\nPlease contact me to confirm what is included.`)}`}
 className={buttonClass('primary', 'md', 'mt-4 w-full btn-press')}
 >
 Email us to request a quote <ArrowRight className="w-3.5 h-3.5" />
 </a>
 <Link href="/yatra" className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>
 Or browse ready yatras
 </Link>
 </div>
 </aside>
 </div>

 <button onClick={() => { setStep(1); setGenerated(null); }} className="mt-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>
 ← Start over
 </button>
 </div>
 )}

 {/* Navigation */}
 {step <= 6 && (
 <div className="mt-8 flex items-center justify-between">
 <button
 onClick={() => setStep(Math.max(1, step - 1))}
 disabled={step === 1}
 className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg disabled:opacity-40"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 <ChevronLeft className="w-3.5 h-3.5" /> Back
 </button>
 {step < 6 && (
 <button
 onClick={() => setStep(step + 1)}
 disabled={!canContinue}
 className={buttonClass('primary', 'md', 'btn-press')}
 >
 Continue <ChevronRight className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 </ScrollReveal>
 );
}

function CounterRow({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
 return (
 <div className="rounded-lg p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
 {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-lg text-sm" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>-</button>
 <span className="text-sm font-semibold min-w-6 text-center" style={{ color: 'var(--color-text)' }}>{value}</span>
 <button onClick={() => onChange(Math.min(20, value + 1))} className="w-8 h-8 rounded-lg text-sm" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}>+</button>
 </div>
 </div>
 </div>
 );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
 return (
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text)' }}>{title}</p>
 </div>
 {children}
 </div>
 );
}

function ChipButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
 return (
 <button
 onClick={onClick}
 className="px-3 py-2 text-xs font-medium rounded-lg capitalize transition-all"
 style={{
 background: active ? 'var(--color-primary)' : 'var(--color-surface)',
 color: active ? '#fff' : 'var(--color-text)',
 border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
 }}
 >
 {label}
 </button>
 );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
 return (
 <div>
 <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-faint)' }}>{label}</p>
 <p className="text-sm font-medium capitalize mt-0.5" style={{ color: 'var(--color-text)' }}>{value}</p>
 </div>
 );
}
