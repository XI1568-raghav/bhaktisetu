'use client';

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MapPin,
  User,
  Package,
  CreditCard,
  Star,
  BadgeCheck,
  Clock,
  Home,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';
import { homePujaCategories, homePandits, type Pandit } from '../../../../../lib/home-pujas';

type StepId = 1 | 2 | 3 | 4 | 5;

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

export default function BookHomePuja({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const category = useMemo(
    () => homePujaCategories.find((c) => c.slug === slug),
    [slug],
  );
  const pandits = useMemo(
    () => homePandits.filter((p) => category?.recommendedPanditIds.includes(p.id) ?? false),
    [category],
  );

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

  // Step 3
  const [tier, setTier] = useState<'basic' | 'standard' | 'premium'>('standard');

  // Step 4
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gotra, setGotra] = useState('');
  const [requests, setRequests] = useState('');

  // Step 5 — payment
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const selectedPandit: Pandit | undefined = pandits.find((p) => p.id === panditId);
  const totalAmount = category ? category.pricing[tier] : 0;

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-surface-800">Puja not found</h1>
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

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 1800);
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[var(--color-border)] rounded-2xl shadow-warm-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-tulsi-green/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-tulsi-green" />
          </div>
          <h2 className="text-2xl font-bold text-surface-800">Booking confirmed!</h2>
          <p className="mt-2 text-surface-500 text-sm">
            Booking ID: <span className="font-mono font-semibold text-surface-800">BS-20260421-
            {Math.floor(10000 + Math.random() * 90000)}</span>
          </p>
          <p className="mt-4 text-surface-600">
            {selectedPandit?.name} will call you within 2 hours to confirm {category.name} on {date}.
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
    <div className="min-h-screen bg-surface-50 pb-20">
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
        <h1 className="text-2xl md:text-3xl font-bold text-surface-800 tracking-tight">
          Book {category.name}
        </h1>
        <p className="text-surface-500 mt-1 text-sm">{category.tagline}</p>
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
              <h2 className="text-xl font-bold text-surface-800 mb-1">Event details</h2>
              <p className="text-sm text-surface-500 mb-6">When and where should the puja be performed?</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-saffron-200"
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
                {pandits.length} verified specialists available for {category.name}.
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
                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <Star className="w-3 h-3 text-temple-gold fill-temple-gold" />
                        <span className="font-semibold">{p.rating}</span>
                        <span className="text-surface-400">({p.reviewCount})</span>
                        <span className="text-surface-300">·</span>
                        <span className="text-surface-500">{p.experience} yrs</span>
                        <span className="text-surface-300">·</span>
                        <span className="text-surface-500">{p.city}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-surface-400">from</div>
                      <div className="font-bold text-surface-800">
                        ₹{p.pricing.homePuja.basic.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </label>
                ))}
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
                        <span className="bg-saffron-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
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
                <Row label="Pandit" value={selectedPandit?.name ?? '—'} />
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
                className="w-full mt-6 py-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {paying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pay ₹{Math.round(totalAmount * 1.18).toLocaleString('en-IN')} securely
                  </>
                )}
              </button>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-surface-500">
                <Shield className="w-3.5 h-3.5" />
                Secured by Razorpay · 256-bit encrypted
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
              {selectedPandit && (
                <div className="flex justify-between">
                  <span className="text-surface-500">Pandit</span>
                  <span className="font-medium text-surface-800 text-right">{selectedPandit.name}</span>
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
                Confirmation call within 2 hours
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
                Pandit arrives with all samagri
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-tulsi-green flex-shrink-0 mt-0.5" />
                Free cancellation 24 hours before
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
