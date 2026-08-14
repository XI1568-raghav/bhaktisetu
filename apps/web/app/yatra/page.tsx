'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
 Mountain,
 Compass,
 MapPin,
 Calendar,
 Users,
 Shield,
 Plane,
 Heart,
 Sparkles,
 ArrowRight,
 Filter,
 CheckCircle2,
 Clock,
 Star,
} from 'lucide-react';
import ScrollReveal from '../../components/ScrollReveal';
import {
 yatras,
 formatINR,
 durationBuckets,
 budgetBuckets,
 regionOptions,
 type YatraRegion,
} from '../../lib/yatra-data';

export default function YatraHubPage() {
 const [durationFilter, setDurationFilter] = useState<string>('all');
 const [budgetFilter, setBudgetFilter] = useState<string>('all');
 const [regionFilter, setRegionFilter] = useState<YatraRegion | 'all'>('all');

 const filtered = useMemo(() => {
 return yatras.filter((y) => {
 if (regionFilter !== 'all' && y.region !== regionFilter) return false;
 if (durationFilter !== 'all') {
 const bucket = durationBuckets.find((b) => b.value === durationFilter);
 if (bucket && !bucket.match(y.durationDays)) return false;
 }
 if (budgetFilter !== 'all') {
 const p = y.startingPrice;
 if (budgetFilter === 'economy' && p > 40000) return false;
 if (budgetFilter === 'standard' && (p < 40000 || p > 100000)) return false;
 if (budgetFilter === 'premium' && p < 100000) return false;
 }
 return true;
 });
 }, [durationFilter, budgetFilter, regionFilter]);

 return (
 <ScrollReveal>
 <div style={{ background: 'var(--color-bg)' }}>
 {/* ═══ HERO ═════════════════════════════════════════════ */}
 <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-art-3) 0%, var(--color-bg) 70%)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 <div
 data-reveal="spring"
 className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-5"
 style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}
 >
 <Mountain className="w-3.5 h-3.5" />
 Dharmic Yatra — Sacred Pilgrimages
 </div>

 <h1
 data-reveal="cinematic"
 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05]"
 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
 >
 Plan Your{' '}
 <span className="text-highlight" style={{ color: 'var(--color-primary)' }}>Sacred Journey</span>
 </h1>

 <p
 data-reveal="up"
 data-delay="2"
 className="mt-4 text-sm leading-relaxed max-w-lg"
 style={{ color: 'var(--color-text-muted)' }}
 >
 Char Dham, 12 Jyotirlingas, Amarnath, Vaishno Devi — fully curated yatras with verified guides, comfortable stays, helicopter options and trained companions for elderly devotees.
 </p>

 <div data-reveal="spring" data-delay="3" className="mt-6 flex items-center gap-3 flex-wrap">
 <Link
 href="/yatra/plan"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-all btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Plan Custom Trip <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 <Link
 href="/yatra/companion"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
 style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text)' }}
 >
 <Users className="w-3.5 h-3.5" /> Book Companion
 </Link>
 <a
 href="#packages"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all"
 style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
 >
 Browse Packages
 </a>
 </div>

 {/* Trust badges */}
 <div data-reveal="fade" data-delay="4" className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl">
 {[
 { icon: Shield, label: 'Verified guides' },
 { icon: Plane, label: 'Helicopter options' },
 { icon: CheckCircle2, label: 'Insurance included' },
 { icon: Clock, label: '24/7 support' },
 ].map((b) => (
 <div key={b.label} className="flex items-center gap-2">
 <b.icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{b.label}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Hero visual bento */}
 <HeroBento />
 </div>
 </div>
 </section>

 {/* ═══ FILTERS ══════════════════════════════════════════ */}
 <section id="packages" className="py-6 border-y" style={{ borderColor: 'var(--color-divider)', background: 'var(--color-surface)' }}>
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center gap-2 mb-3">
 <Filter className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Filter Yatras</p>
 </div>
 <div className="flex flex-wrap gap-3">
 {/* Duration */}
 <div className="flex items-center gap-1.5">
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Duration:</span>
 <select
 value={durationFilter}
 onChange={(e) => setDurationFilter(e.target.value)}
 className="text-xs px-2.5 py-1.5 rounded-md focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 >
 <option value="all">Any</option>
 {durationBuckets.map((b) => (
 <option key={b.value} value={b.value}>{b.label}</option>
 ))}
 </select>
 </div>
 {/* Budget */}
 <div className="flex items-center gap-1.5">
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Budget:</span>
 <select
 value={budgetFilter}
 onChange={(e) => setBudgetFilter(e.target.value)}
 className="text-xs px-2.5 py-1.5 rounded-md focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 >
 <option value="all">Any</option>
 {budgetBuckets.map((b) => (
 <option key={b.value} value={b.value}>{b.label}</option>
 ))}
 </select>
 </div>
 {/* Region */}
 <div className="flex items-center gap-1.5">
 <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Region:</span>
 <select
 value={regionFilter}
 onChange={(e) => setRegionFilter(e.target.value as YatraRegion | 'all')}
 className="text-xs px-2.5 py-1.5 rounded-md focus:outline-none"
 style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
 >
 {regionOptions.map((r) => (
 <option key={r.value} value={r.value}>{r.label}</option>
 ))}
 </select>
 </div>

 <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
 Showing {filtered.length} of {yatras.length} yatras
 </span>
 </div>
 </div>
 </section>

 {/* ═══ YATRA CARDS ═════════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
 {filtered.length === 0 ? (
 <div className="text-center py-12">
 <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No yatras match your filters. Try broadening the search.</p>
 </div>
 ) : (
 <div data-reveal="up" className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filtered.map((y) => (
 <Link
 key={y.slug}
 href={`/yatra/${y.slug}`}
 className="group rounded-xl overflow-hidden card-hover flex flex-col"
 style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
 >
 <div className="aspect-[16/10] relative overflow-hidden">
 <img src={y.heroImage} alt={y.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
 {y.helicopterAvailable && (
 <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 backdrop-blur text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: 'var(--color-primary)' }}>
 <Plane className="w-2.5 h-2.5" /> Heli option
 </div>
 )}
 <div className="absolute bottom-3 left-3 right-3">
 <h3 className="text-base font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{y.title}</h3>
 <p className="text-xs text-white/80 mt-0.5">{y.subtitle}</p>
 </div>
 </div>

 <div className="p-4 flex flex-col flex-1">
 <div className="flex items-center gap-3 text-xs mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
 <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {y.durationDays} days</span>
 <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {y.places.length} stops</span>
 <span className="flex items-center gap-1"><Compass className="w-3 h-3" /> {y.region}</span>
 </div>

 <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
 {y.description}
 </p>

 <div className="mt-3 flex flex-wrap gap-1">
 {y.tags.slice(0, 3).map((t) => (
 <span key={t} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)' }}>
 {t}
 </span>
 ))}
 </div>

 <div className="mt-auto pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-divider)' }}>
 <div>
 <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Starts from</p>
 <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{formatINR(y.startingPrice)} <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>/ person</span></p>
 </div>
 <div className="flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }}>
 View details <ArrowRight className="w-3 h-3" />
 </div>
 </div>
 </div>
 </Link>
 ))}
 </div>
 )}
 </div>
 </section>

 {/* ═══ TRAVEL COMPANION HIGHLIGHT ═══════════════════════ */}
 <section className="py-12 md:py-14" style={{ background: 'var(--color-surface)' }}>
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="grid md:grid-cols-2 gap-8 items-center">
 <div>
 <p data-reveal="fade" className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--color-primary)' }}>For Elderly Devotees</p>
 <h2 data-reveal="spring" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Verified travel companions who care like family
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-text-muted)' }}>
 Our trained companions handle logistics, mobility, medication reminders, photos and family updates — so your elderly parents can focus entirely on darshan. Aadhaar verified, background checked, first-aid certified.
 </p>
 <Link
 href="/yatra/companion"
 data-reveal="spring" data-delay="2"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 <Heart className="w-3.5 h-3.5" /> Meet our companions <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 <div data-reveal="glow" data-delay="1" className="grid grid-cols-2 gap-3">
 {[
 { icon: Shield, t: 'Background verified', s: 'Aadhaar + police check' },
 { icon: Heart, t: 'First-aid certified', s: 'Medicine + BP monitoring' },
 { icon: MapPin, t: 'GPS tracking', s: 'Real-time family updates' },
 { icon: Star, t: 'Hand-screened', s: 'Every companion is interviewed' },
 ].map((f) => (
 <div key={f.t} className="p-4 rounded-xl" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
 <f.icon className="w-4 h-4 mb-2" style={{ color: 'var(--color-primary)' }} />
 <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{f.t}</p>
 <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{f.s}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ CUSTOM TRIP CTA ═════════════════════════════════ */}
 <section className="py-10 md:py-12">
 <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 <Compass className="w-6 h-6 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
 <h2 data-reveal="cinematic" className="text-xl sm:text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
 Can&apos;t find your perfect yatra?
 </h2>
 <p data-reveal="up" data-delay="1" className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }}>
 Pick your destinations, dates and preferences — our team will craft a personalized itinerary within 24 hours.
 </p>
 <Link
 href="/yatra/plan"
 data-reveal="spring" data-delay="2"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Plan Custom Yatra <ArrowRight className="w-3.5 h-3.5" />
 </Link>
 </div>
 </section>
 </div>
 </ScrollReveal>
 );
}

function HeroBento() {
 const flagship = yatras.find((y) => y.slug === 'char-dham');
 const amarnath = yatras.find((y) => y.slug === 'amarnath');
 const tirupati = yatras.find((y) => y.slug === 'tirupati-south');
 if (!flagship || !amarnath || !tirupati) return null;
 return (
 <div data-reveal="zoom-rotate" data-delay="1" className="hidden md:grid grid-cols-3 gap-2.5">
 <div className="col-span-2 row-span-2 rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
 <img src={flagship.heroImage} alt="Char Dham" className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
 <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-saffron-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
 <Sparkles className="w-2.5 h-2.5" /> FLAGSHIP
 </div>
 <div className="absolute bottom-3 left-3 right-3">
 <p className="text-sm font-semibold text-white">{flagship.title}</p>
 <p className="text-xs text-white/70">{flagship.durationDays} days • Himalayas • From {formatINR(flagship.startingPrice)}</p>
 </div>
 </div>
 <div className="rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
 <img src={amarnath.heroImage} alt="Amarnath" className="w-full h-full object-cover" loading="lazy" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
 <div className="absolute bottom-2 left-2 right-2">
 <p className="text-xs font-semibold text-white">Amarnath</p>
 <p className="text-xs text-white/70">{amarnath.durationDays} days</p>
 </div>
 </div>
 <div className="rounded-xl overflow-hidden relative" style={{ border: '1px solid var(--color-border)' }}>
 <img src={tirupati.heroImage} alt="Tirupati" className="w-full h-full object-cover" loading="lazy" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
 <div className="absolute bottom-2 left-2 right-2">
 <p className="text-xs font-semibold text-white">Tirupati</p>
 <p className="text-xs text-white/70">{tirupati.durationDays} days</p>
 </div>
 </div>
 </div>
 );
}
