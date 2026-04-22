'use client';
export const runtime = 'edge';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  MapPin,
  Calendar,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Shield,
  Video,
  Gift,
  Loader2,
  AlertCircle,
  Home,
  Package,
  Star,
  BadgeCheck,
  IndianRupee,
  Sun,
  Sunrise,
  Sunset,
  Check,
  X,
  ArrowRight,
  PartyPopper,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import { API_BASE_URL } from '../../../../lib/api-config';

// ─── Types ──────────────────────────────────────────────────────

interface TempleOption {
  id: string;
  templeName: string;
  templeSlug: string;
  templeCity: string;
  templeState: string;
  priceOverride: string | null;
  availableSlots: { time: string; label: string }[];
  isActive: boolean;
  trustScore: number;
  isVerified: boolean;
}

interface PujaInfo {
  id: string;
  name: string;
  slug: string;
  deity: string;
  durationMinutes: number;
  basePrice: string;
  nriPrice: string;
  category: string;
  samagriIncluded: boolean;
  temples: TempleOption[];
}

interface Devotee {
  id: string;
  name: string;
  gotra: string;
  nakshatra: string;
}

interface SlotAvailability {
  time: string;
  label: string;
  remaining: number;
  total: number;
}

// ─── Constants ──────────────────────────────────────────────────

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Vishakha', 'Anuradha', 'Jyeshtha', 'Moola', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const PLATFORM_FEE = 51;
const PRASAD_DELIVERY_FEE = 150;

const STEP_LABELS = ['Temple & Date', 'Devotee Details', 'Review & Prasad', 'Payment'];

// ─── Fallback puja data ─────────────────────────────────────────

function getFallbackPuja(slug: string): PujaInfo {
  const name = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const fallbackMap: Record<string, Partial<PujaInfo>> = {
    rudrabhishek: {
      id: '1',
      name: 'Rudrabhishek Puja',
      deity: 'Lord Shiva',
      durationMinutes: 120,
      basePrice: '1100',
      nriPrice: '5100',
      category: 'Abhishekam',
      samagriIncluded: true,
    },
    'satyanarayan-katha': {
      id: '2',
      name: 'Satyanarayan Katha',
      deity: 'Lord Vishnu',
      durationMinutes: 90,
      basePrice: '751',
      nriPrice: '3001',
      category: 'Path / Paath',
      samagriIncluded: true,
    },
    'maha-mrityunjay-jaap': {
      id: '4',
      name: 'Maha Mrityunjay Jaap',
      deity: 'Lord Shiva',
      durationMinutes: 180,
      basePrice: '1500',
      nriPrice: '5001',
      category: 'Jaap',
      samagriIncluded: true,
    },
  };

  const base = fallbackMap[slug] || {
    id: 'default',
    name: `${name} Puja`,
    deity: 'Lord Shiva',
    durationMinutes: 90,
    basePrice: '751',
    nriPrice: '3501',
    category: 'Special Puja',
    samagriIncluded: true,
  };

  return {
    slug,
    temples: [
      {
        id: 'to-1',
        templeName: 'Shri Kashi Vishwanath Temple',
        templeSlug: 'kashi-vishwanath',
        templeCity: 'Varanasi',
        templeState: 'Uttar Pradesh',
        priceOverride: null,
        availableSlots: [
          { time: '06:00', label: 'Early Morning (6:00 AM)' },
          { time: '09:00', label: 'Morning (9:00 AM)' },
          { time: '14:00', label: 'Afternoon (2:00 PM)' },
          { time: '17:00', label: 'Evening (5:00 PM)' },
        ],
        isActive: true,
        trustScore: 98,
        isVerified: true,
      },
      {
        id: 'to-2',
        templeName: 'Trimbakeshwar Temple',
        templeSlug: 'trimbakeshwar',
        templeCity: 'Nashik',
        templeState: 'Maharashtra',
        priceOverride: null,
        availableSlots: [
          { time: '07:00', label: 'Morning (7:00 AM)' },
          { time: '10:00', label: 'Mid-Morning (10:00 AM)' },
          { time: '16:00', label: 'Afternoon (4:00 PM)' },
        ],
        isActive: true,
        trustScore: 96,
        isVerified: true,
      },
      {
        id: 'to-3',
        templeName: 'Siddhivinayak Temple',
        templeSlug: 'siddhivinayak',
        templeCity: 'Mumbai',
        templeState: 'Maharashtra',
        priceOverride: null,
        availableSlots: [
          { time: '07:30', label: 'Morning (7:30 AM)' },
          { time: '11:00', label: 'Late Morning (11:00 AM)' },
        ],
        isActive: true,
        trustScore: 95,
        isVerified: true,
      },
    ],
    ...base,
  } as PujaInfo;
}

// ─── Helpers ────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0] as string;
}

function getMaxDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0] as string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getSlotPeriod(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time.split(':')[0] ?? '0', 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function getSlotPeriodIcon(period: string) {
  switch (period) {
    case 'morning':
      return Sunrise;
    case 'afternoon':
      return Sun;
    case 'evening':
      return Sunset;
    default:
      return Clock;
  }
}

function generateBookingNumber(): string {
  const now = new Date();
  const dateStr = (now.toISOString().split('T')[0] as string).replace(/-/g, '');
  const random = String(Math.floor(10000 + Math.random() * 90000));
  return `BS-${dateStr}-${random}`;
}

// ─── Load Razorpay ──────────────────────────────────────────────

const loadRazorpay = (): Promise<any> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve((window as any).Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve((window as any).Razorpay);
    document.body.appendChild(script);
  });
};

// ─── Component ──────────────────────────────────────────────────

export default function PujaBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const preselectedTemple = searchParams.get('temple') || '';
  const { user, session, isAuthenticated } = useAuth();

  // Data state
  const [puja, setPuja] = useState<PujaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1
  const [selectedTempleId, setSelectedTempleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTomorrow());
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slotAvailability, setSlotAvailability] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 2
  const [devotees, setDevotees] = useState<Devotee[]>([
    { id: generateId(), name: '', gotra: '', nakshatra: '' },
  ]);
  const [sankalp, setSankalp] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // AI Sankalp Generator
  const [aiSankalpLoading, setAiSankalpLoading] = useState(false);
  const [aiSankalpError, setAiSankalpError] = useState(false);
  const [aiSankalpResult, setAiSankalpResult] = useState<{
    sanskrit: string;
    transliteration: string;
    englishTranslation: string;
    hindiTranslation: string;
  } | null>(null);
  const [aiSankalpExpanded, setAiSankalpExpanded] = useState(true);

  // Step 3
  const [wantsPrasad, setWantsPrasad] = useState(false);
  const [address, setAddress] = useState({
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Step 4 / Success
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');

  // ─── Validation errors ──────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Fetch puja data ────────────────────────────────────────
  useEffect(() => {
    async function fetchPuja() {
      try {
        const res = await fetch(`${API_BASE_URL}/pujas/types/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPuja(data);
        } else {
          setPuja(getFallbackPuja(slug));
        }
      } catch {
        setPuja(getFallbackPuja(slug));
      } finally {
        setLoading(false);
      }
    }
    fetchPuja();
  }, [slug]);

  // Pre-select temple from URL param
  useEffect(() => {
    if (puja && preselectedTemple) {
      const temple = puja.temples.find((t) => t.templeSlug === preselectedTemple);
      if (temple) setSelectedTempleId(temple.id);
    }
  }, [puja, preselectedTemple]);

  // ─── Derived ────────────────────────────────────────────────
  const selectedTemple = useMemo(
    () => puja?.temples.find((t) => t.id === selectedTempleId) ?? null,
    [puja, selectedTempleId],
  );

  const basePrice = useMemo(() => {
    if (!puja || !selectedTemple) return 0;
    return Number(selectedTemple.priceOverride || puja.basePrice);
  }, [puja, selectedTemple]);

  const totalPrice = useMemo(() => {
    let total = basePrice + PLATFORM_FEE;
    if (wantsPrasad) total += PRASAD_DELIVERY_FEE;
    return total;
  }, [basePrice, wantsPrasad]);

  // ─── Fetch slot availability ────────────────────────────────
  useEffect(() => {
    if (!selectedTemple || !selectedDate) {
      setSlotAvailability([]);
      return;
    }

    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/bookings/slots?templeId=${selectedTemple!.id}&date=${selectedDate}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSlotAvailability(data.slots);
        } else {
          throw new Error('API unavailable');
        }
      } catch {
        // Fallback: generate mock availability
        const mockSlots: SlotAvailability[] = selectedTemple!.availableSlots.map((s) => ({
          time: s.time,
          label: s.label,
          remaining: Math.floor(Math.random() * 8) + 2,
          total: 10,
        }));
        setSlotAvailability(mockSlots);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
    setSelectedSlot('');
  }, [selectedTemple, selectedDate]);

  // ─── Validation ─────────────────────────────────────────────

  const validateStep = useCallback(
    (step: number): boolean => {
      const errs: Record<string, string> = {};

      if (step === 0) {
        if (!selectedTempleId) errs.temple = 'Please select a temple';
        if (!selectedDate) errs.date = 'Please select a date';
        if (!selectedSlot) errs.slot = 'Please select a time slot';
      }

      if (step === 1) {
        devotees.forEach((d, i) => {
          if (!d.name.trim()) errs[`devotee_${i}_name`] = 'Name is required';
        });
      }

      if (step === 2) {
        if (!agreedTerms) errs.terms = 'Please agree to the terms & conditions';
        if (wantsPrasad) {
          if (!address.fullName.trim()) errs.addr_name = 'Name is required';
          if (!address.line1.trim()) errs.addr_line1 = 'Address line 1 is required';
          if (!address.city.trim()) errs.addr_city = 'City is required';
          if (!address.state.trim()) errs.addr_state = 'State is required';
          if (!address.pincode.trim()) errs.addr_pincode = 'Pincode is required';
          else if (!/^\d{6}$/.test(address.pincode.trim()))
            errs.addr_pincode = 'Enter valid 6-digit pincode';
          if (!address.phone.trim()) errs.addr_phone = 'Phone is required';
          else if (!/^[6-9]\d{9}$/.test(address.phone.trim()))
            errs.addr_phone = 'Enter valid 10-digit phone number';
        }
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [selectedTempleId, selectedDate, selectedSlot, devotees, agreedTerms, wantsPrasad, address],
  );

  // ─── Navigation ─────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, validateStep]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ─── Devotee management ─────────────────────────────────────

  const addDevotee = () => {
    if (devotees.length < 5) {
      setDevotees([...devotees, { id: generateId(), name: '', gotra: '', nakshatra: '' }]);
    }
  };

  const removeDevotee = (id: string) => {
    if (devotees.length > 1) {
      setDevotees(devotees.filter((d) => d.id !== id));
    }
  };

  const updateDevotee = (id: string, field: keyof Devotee, value: string) => {
    setDevotees(devotees.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  // ─── Payment ────────────────────────────────────────────────

  const handlePayment = async () => {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setPaymentLoading(true);
    setPaymentError('');

    try {
      // Step 1: Create order on backend
      let orderId: string;
      let razorpayOrderId: string;
      let amount: number;

      try {
        const res = await fetch(`${API_BASE_URL}/bookings/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            pujaSlug: slug,
            templeOfferingId: selectedTempleId,
            scheduledDate: selectedDate,
            scheduledTime: selectedSlot,
            devotees: devotees.map((d) => ({
              name: d.name,
              gotra: d.gotra || undefined,
              nakshatra: d.nakshatra || undefined,
            })),
            sankalp: sankalp || undefined,
            specialInstructions: specialInstructions || undefined,
            prasadDelivery: wantsPrasad,
            deliveryAddress: wantsPrasad ? address : undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          orderId = data.orderId;
          razorpayOrderId = data.razorpayOrderId;
          amount = data.amount;
        } else {
          throw new Error('API unavailable');
        }
      } catch {
        // Mock order for demo
        orderId = generateId();
        razorpayOrderId = 'order_' + generateId();
        amount = totalPrice * 100; // paise
      }

      // Step 2: Open Razorpay checkout
      const Razorpay = await loadRazorpay();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo',
        amount,
        currency: 'INR',
        name: 'Poojly',
        description: `${puja?.name} at ${selectedTemple?.templeName}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.fullName || '',
          contact: user?.phone || '',
          email: user?.email || '',
        },
        theme: {
          color: '#ea580c',
        },
        handler: async (response: any) => {
          // Step 3: Verify payment
          try {
            await fetch(`${API_BASE_URL}/bookings/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.accessToken}`,
              },
              body: JSON.stringify({
                orderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
          } catch {
            // Verification may fail in demo mode
          }

          const bkNum = generateBookingNumber();
          setBookingNumber(bkNum);
          setBookingSuccess(true);
          setPaymentLoading(false);
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      };

      const rzp = new Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        setPaymentError(
          response.error?.description ||
            'Payment failed. Please try again or use a different payment method.',
        );
        setPaymentLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      setPaymentError(err.message || 'Something went wrong. Please try again.');
      setPaymentLoading(false);
    }
  };

  // ─── AI Sankalp Generation ──────────────────────────────────
  const generateAiSankalp = async () => {
    setAiSankalpLoading(true);
    setAiSankalpError(false);
    setAiSankalpResult(null);

    try {
      const firstDevotee = devotees[0];
      const body = {
        devoteeName: firstDevotee?.name || '',
        gotra: firstDevotee?.gotra || undefined,
        nakshatra: firstDevotee?.nakshatra || undefined,
        pujaName: puja?.name || '',
        deity: puja?.deity || '',
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/ai/generate-sankalp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSankalpResult({
          sanskrit: data.sanskrit || '',
          transliteration: data.transliteration || '',
          englishTranslation: data.englishTranslation || '',
          hindiTranslation: data.hindiTranslation || '',
        });
        setAiSankalpExpanded(true);
      } else {
        throw new Error('API error');
      }
    } catch {
      setAiSankalpError(true);
    } finally {
      setAiSankalpLoading(false);
    }
  };

  const useAiSankalp = () => {
    if (aiSankalpResult) {
      const fullSankalp = `${aiSankalpResult.sanskrit}\n\n${aiSankalpResult.transliteration}\n\n(${aiSankalpResult.englishTranslation})`;
      setSankalp(fullSankalp);
      setAiSankalpExpanded(false);
    }
  };

  // Demo payment for testing without Razorpay
  const handleDemoPayment = () => {
    setPaymentLoading(true);
    setTimeout(() => {
      const bkNum = generateBookingNumber();
      setBookingNumber(bkNum);
      setBookingSuccess(true);
      setPaymentLoading(false);
    }, 2000);
  };

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-saffron-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-saffron-200 border-t-saffron-600" />
          <p className="text-sm text-surface-500">Loading puja details...</p>
        </div>
      </div>
    );
  }

  if (!puja) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-saffron-50">
        <div className="text-center">
          <Flame className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h2 className="mb-2 text-xl font-bold text-surface-700">Puja Not Found</h2>
          <p className="mb-4 text-surface-500">We could not find the puja you are looking for.</p>
          <Link
            href="/pujas"
            className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
          >
            Browse Pujas
          </Link>
        </div>
      </div>
    );
  }

  // ─── Success Screen ─────────────────────────────────────────

  if (bookingSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-saffron-50 to-white px-4">
        <div className="w-full max-w-lg text-center">
          {/* Success animation */}
          <div className="relative mx-auto mb-6 h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-tulsi-green/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-tulsi-green">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-surface-800">Booking Confirmed!</h1>
          <p className="mb-6 text-surface-500">
            Your puja has been booked successfully. The temple will assign a priest shortly.
          </p>

          <div className="mb-8 rounded-xl border border-surface-100 bg-white p-6 text-left shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-surface-500">Booking Number</span>
              <button
                onClick={() => navigator.clipboard?.writeText(bookingNumber)}
                className="flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>
            <p className="mb-4 text-center text-2xl font-bold tracking-wider text-saffron-600">
              {bookingNumber}
            </p>

            <div className="space-y-3 border-t border-surface-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Puja</span>
                <span className="font-medium text-surface-700">{puja.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Temple</span>
                <span className="font-medium text-surface-700">{selectedTemple?.templeName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Date</span>
                <span className="font-medium text-surface-700">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Time</span>
                <span className="font-medium text-surface-700">
                  {slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Amount Paid</span>
                <span className="font-bold text-tulsi-green">
                  ₹{totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-saffron-200 bg-saffron-50 p-4">
            <div className="flex items-start gap-3">
              <Video className="mt-0.5 h-5 w-5 shrink-0 text-saffron-600" />
              <p className="text-sm text-surface-600">
                You will receive <strong>video proof</strong> after the puja is performed. A
                notification will be sent to your registered phone number.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/bookings"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-saffron-600 px-6 py-3 font-medium text-white hover:bg-saffron-700"
            >
              View Booking
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              href="/pujas"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-saffron-200 px-6 py-3 font-semibold text-saffron-600 hover:bg-saffron-50"
            >
              <Flame className="h-4 w-4" />
              Book Another Puja
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-surface-600 hover:bg-surface-100"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Booking Form ──────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Breadcrumb */}
      <div className="border-b border-surface-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-surface-500">
            <Link href="/" className="hover:text-orange-600">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/pujas" className="hover:text-orange-600">Pujas</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/pujas/${slug}`} className="hover:text-orange-600">{puja.name}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-surface-700">Book</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Page title */}
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-bold text-surface-800 md:text-3xl">
            Book {puja.name}
          </h1>
          <p className="text-surface-500">
            {puja.deity} &middot; {puja.durationMinutes} min &middot; {puja.category}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => {
              const isCompleted = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={label} className="flex flex-1 flex-col items-center">
                  <div className="relative flex w-full items-center">
                    {/* Connector line (left side) */}
                    {i > 0 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          i <= currentStep ? 'bg-saffron-500' : 'bg-surface-200'
                        }`}
                      />
                    )}
                    {i === 0 && <div className="flex-1" />}

                    {/* Step circle */}
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                        isCompleted
                          ? 'border-tulsi-green bg-tulsi-green text-white'
                          : isCurrent
                            ? 'border-saffron-500 bg-saffron-500 text-white shadow-lg'
                            : 'border-surface-200 bg-white text-surface-400'
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
                    </div>

                    {/* Connector line (right side) */}
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          i < currentStep ? 'bg-saffron-500' : 'bg-surface-200'
                        }`}
                      />
                    )}
                    {i === STEP_LABELS.length - 1 && <div className="flex-1" />}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent ? 'text-saffron-600' : isCompleted ? 'text-tulsi-green' : 'text-surface-400'
                    }`}
                  >
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── STEP 1: Temple, Date & Time ─────────────────── */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Temple Selection */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <MapPin className="h-5 w-5 text-saffron-500" />
                Select Temple
              </h2>
              {errors.temple && (
                <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errors.temple}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {puja.temples.map((temple) => {
                  const isSelected = selectedTempleId === temple.id;
                  const price = temple.priceOverride || puja.basePrice;
                  return (
                    <button
                      key={temple.id}
                      onClick={() => setSelectedTempleId(temple.id)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-saffron-500 bg-saffron-50 shadow-md'
                          : 'border-surface-100 bg-white hover:border-saffron-200 hover:bg-saffron-50/30'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-saffron-500">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div className="mb-1 flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-surface-800">
                          {temple.templeName}
                        </h3>
                        {temple.isVerified && (
                          <BadgeCheck className="h-4 w-4 text-tulsi-green" />
                        )}
                      </div>
                      <p className="mb-2 flex items-center gap-1 text-xs text-surface-500">
                        <MapPin className="h-3 w-3" />
                        {temple.templeCity}, {temple.templeState}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-saffron-600">
                          ₹{Number(price).toLocaleString('en-IN')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-surface-400">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          {(temple.trustScore / 20).toFixed(1)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <Calendar className="h-5 w-5 text-saffron-500" />
                Select Date
              </h2>
              {errors.date && (
                <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errors.date}
                </p>
              )}
              <input
                type="date"
                value={selectedDate}
                min={getTomorrow()}
                max={getMaxDate()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-surface-200 px-4 py-3 text-surface-700 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:max-w-xs"
              />
              {selectedDate && (
                <p className="mt-2 text-sm text-surface-500">{formatDate(selectedDate)}</p>
              )}
            </div>

            {/* Time Slot Selection */}
            {selectedTemple && (
              <div className="rounded-xl border border-surface-100 bg-white p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                  <Clock className="h-5 w-5 text-saffron-500" />
                  Select Time Slot
                </h2>
                {errors.slot && (
                  <p className="mb-3 flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" /> {errors.slot}
                  </p>
                )}

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-saffron-500" />
                    <span className="ml-2 text-sm text-surface-500">Checking availability...</span>
                  </div>
                ) : (
                  <>
                    {['morning', 'afternoon', 'evening'].map((period) => {
                      const periodSlots = slotAvailability.filter(
                        (s) => getSlotPeriod(s.time) === period,
                      );
                      if (periodSlots.length === 0) return null;
                      const PeriodIcon = getSlotPeriodIcon(period);
                      return (
                        <div key={period} className="mb-4 last:mb-0">
                          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium capitalize text-surface-600">
                            <PeriodIcon className="h-4 w-4 text-saffron-400" />
                            {period}
                          </h3>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {periodSlots.map((slot) => {
                              const isFull = slot.remaining === 0;
                              const isSelected = selectedSlot === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  disabled={isFull}
                                  onClick={() => setSelectedSlot(slot.time)}
                                  className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                                    isFull
                                      ? 'cursor-not-allowed border-surface-100 bg-surface-50 opacity-50'
                                      : isSelected
                                        ? 'border-saffron-500 bg-saffron-50 shadow-md'
                                        : 'border-surface-100 hover:border-saffron-200'
                                  }`}
                                >
                                  <p className="text-sm font-semibold text-surface-700">
                                    {slot.label}
                                  </p>
                                  <p
                                    className={`mt-1 text-xs ${
                                      isFull
                                        ? 'text-red-400'
                                        : slot.remaining <= 3
                                          ? 'text-amber-500 font-medium'
                                          : 'text-tulsi-green'
                                    }`}
                                  >
                                    {isFull
                                      ? 'Full'
                                      : `${slot.remaining} spot${slot.remaining !== 1 ? 's' : ''} left`}
                                  </p>
                                  {isSelected && (
                                    <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-saffron-500">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Next Button */}
            <div className="flex justify-end">
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Devotee Details ─────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <Users className="h-5 w-5 text-saffron-500" />
                Devotee Details
              </h2>
              <p className="mb-6 text-sm text-surface-500">
                Add details of the devotees for whom this puja will be performed (1-5 devotees).
              </p>

              <div className="space-y-4">
                {devotees.map((devotee, index) => (
                  <div
                    key={devotee.id}
                    className="rounded-xl border border-surface-100 bg-surface-50/50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-surface-600">
                        Devotee {index + 1}
                      </span>
                      {devotees.length > 1 && (
                        <button
                          onClick={() => removeDevotee(devotee.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Name */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-surface-600">
                          Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={devotee.name}
                          onChange={(e) => updateDevotee(devotee.id, 'name', e.target.value)}
                          placeholder="Enter full name"
                          className={`w-full rounded-lg border px-3 py-2 text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                            errors[`devotee_${index}_name`]
                              ? 'border-red-300 bg-red-50'
                              : 'border-surface-200'
                          }`}
                        />
                        {errors[`devotee_${index}_name`] && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors[`devotee_${index}_name`]}
                          </p>
                        )}
                      </div>

                      {/* Gotra */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-surface-600">
                          Gotra <span className="text-surface-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={devotee.gotra}
                          onChange={(e) => updateDevotee(devotee.id, 'gotra', e.target.value)}
                          placeholder="e.g., Kashyap"
                          className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
                        />
                      </div>

                      {/* Nakshatra */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-surface-600">
                          Nakshatra <span className="text-surface-400">(optional)</span>
                        </label>
                        <select
                          value={devotee.nakshatra}
                          onChange={(e) => updateDevotee(devotee.id, 'nakshatra', e.target.value)}
                          className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-saffron-200"
                        >
                          <option value="">Select nakshatra</option>
                          {NAKSHATRAS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {devotees.length < 5 && (
                <button
                  onClick={addDevotee}
                  className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-saffron-600 hover:text-saffron-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Devotee
                </button>
              )}
            </div>

            {/* Sankalp */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <Flame className="h-5 w-5 text-saffron-500" />
                Sankalp (Prayer Intention)
              </h2>
              <textarea
                value={sankalp}
                onChange={(e) => setSankalp(e.target.value)}
                rows={3}
                placeholder="Describe your prayer intention (e.g., For the good health and prosperity of my family...)"
                className="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 placeholder:text-surface-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />

              {/* AI Sankalp Generator */}
              <div className="mt-4 rounded-xl border border-dashed border-saffron-200 bg-saffron-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-temple-gold" />
                    <span className="text-sm font-semibold text-surface-700">AI Sankalp Generator</span>
                  </div>
                  {!aiSankalpLoading && (
                    <button
                      onClick={generateAiSankalp}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-saffron-700 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      {aiSankalpResult ? 'Regenerate' : 'Generate Sankalp with AI'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-surface-500 mb-3">
                  Generate a traditional Sanskrit sankalp based on devotee details, puja type, and deity.
                </p>

                {/* Loading */}
                {aiSankalpLoading && (
                  <div className="flex items-center justify-center py-6">
                    <div className="flex items-center gap-2 text-sm text-saffron-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating sankalp...</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {aiSankalpError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                    <AlertCircle className="mx-auto mb-1 h-5 w-5 text-red-400" />
                    <p className="text-xs font-medium text-red-700">AI sankalp generation unavailable</p>
                    <p className="text-xs text-red-500 mt-0.5">Please write your own sankalp above.</p>
                  </div>
                )}

                {/* Result */}
                {aiSankalpResult && !aiSankalpLoading && (
                  <div className="rounded-lg border border-saffron-200 bg-white overflow-hidden">
                    {/* Toggle header */}
                    <button
                      onClick={() => setAiSankalpExpanded((prev) => !prev)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-surface-700">Generated Sankalp</span>
                      {aiSankalpExpanded ? (
                        <ChevronUp className="h-4 w-4 text-surface-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-surface-400" />
                      )}
                    </button>

                    {aiSankalpExpanded && (
                      <div className="border-t border-surface-100 px-4 py-3 space-y-3">
                        {/* Sanskrit */}
                        {aiSankalpResult.sanskrit && (
                          <div>
                            <p className="text-xs font-semibold text-saffron-600 mb-1">Sanskrit</p>
                            <p className="text-sm text-surface-700 font-medium leading-relaxed">
                              {aiSankalpResult.sanskrit}
                            </p>
                          </div>
                        )}

                        {/* Transliteration */}
                        {aiSankalpResult.transliteration && (
                          <div>
                            <p className="text-xs font-semibold text-purple-600 mb-1">Transliteration</p>
                            <p className="text-sm text-surface-600 italic leading-relaxed">
                              {aiSankalpResult.transliteration}
                            </p>
                          </div>
                        )}

                        {/* English Translation */}
                        {aiSankalpResult.englishTranslation && (
                          <div>
                            <p className="text-xs font-semibold text-blue-600 mb-1">English Translation</p>
                            <p className="text-sm text-surface-600 leading-relaxed">
                              {aiSankalpResult.englishTranslation}
                            </p>
                          </div>
                        )}

                        {/* Hindi Translation */}
                        {aiSankalpResult.hindiTranslation && (
                          <div>
                            <p className="text-xs font-semibold text-green-600 mb-1">Hindi Translation</p>
                            <p className="text-sm text-surface-600 leading-relaxed">
                              {aiSankalpResult.hindiTranslation}
                            </p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={useAiSankalp}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-600 px-4 py-2 text-xs font-medium text-white hover:bg-saffron-700 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Use This Sankalp
                          </button>
                          <button
                            onClick={generateAiSankalp}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Regenerate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-surface-800">Special Instructions</h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                placeholder="Any special requests or instructions for the priest (optional)"
                className="w-full rounded-xl border border-surface-200 px-4 py-3 text-sm text-surface-700 placeholder:text-surface-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Review & Prasad ─────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <CheckCircle2 className="h-5 w-5 text-saffron-500" />
                Order Summary
              </h2>
              <div className="space-y-3">
                <SummaryRow label="Puja" value={puja.name} />
                <SummaryRow label="Temple" value={selectedTemple?.templeName || '-'} />
                <SummaryRow
                  label="Location"
                  value={
                    selectedTemple
                      ? `${selectedTemple.templeCity}, ${selectedTemple.templeState}`
                      : '-'
                  }
                />
                <SummaryRow label="Date" value={formatDate(selectedDate)} />
                <SummaryRow
                  label="Time"
                  value={
                    slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot
                  }
                />
                <SummaryRow
                  label="Devotees"
                  value={devotees
                    .map((d) => d.name)
                    .filter(Boolean)
                    .join(', ')}
                />
                {sankalp && <SummaryRow label="Sankalp" value={sankalp} />}
              </div>
            </div>

            {/* Prasad Delivery */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-surface-800">
                  <Gift className="h-5 w-5 text-saffron-500" />
                  Prasad Delivery
                </h2>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={wantsPrasad}
                    onChange={(e) => setWantsPrasad(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-surface-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all after:content-[''] peer-checked:bg-saffron-500 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-saffron-200" />
                </label>
              </div>

              {wantsPrasad ? (
                <div>
                  <p className="mb-4 text-sm text-surface-500">
                    Sacred prasad from the temple will be delivered to your address.
                    <span className="ml-1 font-semibold text-saffron-600">
                      +₹{PRASAD_DELIVERY_FEE}
                    </span>
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.fullName}
                        onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                        placeholder="Recipient name"
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_name ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_name && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        Phone <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        placeholder="10-digit number"
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_phone ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_phone && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_phone}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        Address Line 1 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.line1}
                        onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                        placeholder="House/Flat No., Street"
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_line1 ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_line1 && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_line1}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={address.line2}
                        onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                        placeholder="Area, Landmark (optional)"
                        className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        City <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        placeholder="City"
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_city ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_city && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_city}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        State <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        placeholder="State"
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_state ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_state && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_state}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-surface-600">
                        Pincode <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={address.pincode}
                        onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                        placeholder="6-digit pincode"
                        maxLength={6}
                        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 ${
                          errors.addr_pincode ? 'border-red-300 bg-red-50' : 'border-surface-200'
                        }`}
                      />
                      {errors.addr_pincode && (
                        <p className="mt-1 text-xs text-red-500">{errors.addr_pincode}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-surface-500">
                  Toggle the switch to add prasad delivery to your order (+₹{PRASAD_DELIVERY_FEE}).
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <IndianRupee className="h-5 w-5 text-saffron-500" />
                Price Breakdown
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">Puja Fee</span>
                  <span className="font-medium text-surface-700">
                    ₹{basePrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-600">Platform Fee</span>
                  <span className="font-medium text-surface-700">
                    ₹{PLATFORM_FEE.toLocaleString('en-IN')}
                  </span>
                </div>
                {wantsPrasad && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Prasad Delivery</span>
                    <span className="font-medium text-surface-700">
                      ₹{PRASAD_DELIVERY_FEE.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="border-t border-surface-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-surface-800">Total</span>
                    <span className="text-xl font-bold text-saffron-600">
                      ₹{totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="rounded-xl border border-surface-100 bg-white p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-200"
                />
                <span className="text-sm text-surface-600">
                  I agree to the{' '}
                  <Link href="/terms" className="font-medium text-saffron-600 hover:underline">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/refunds" className="font-medium text-saffron-600 hover:underline">
                    Refund Policy
                  </Link>
                  . I understand that cancellation is allowed up to 24 hours before the scheduled
                  puja time.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-2 flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errors.terms}
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-8 py-3 font-medium text-white transition-colors hover:bg-saffron-700"
              >
                Proceed to Payment
                <CreditCard className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Payment ─────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Final Summary */}
            <div className="rounded-xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-surface-800">
                <CreditCard className="h-5 w-5 text-saffron-500" />
                Complete Your Payment
              </h2>
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs text-surface-500">Puja</p>
                  <p className="font-semibold text-surface-700">{puja.name}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs text-surface-500">Temple</p>
                  <p className="font-semibold text-surface-700">{selectedTemple?.templeName}</p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs text-surface-500">Date & Time</p>
                  <p className="font-semibold text-surface-700">
                    {formatDate(selectedDate)}
                    <br />
                    {slotAvailability.find((s) => s.time === selectedSlot)?.label || selectedSlot}
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-3">
                  <p className="text-xs text-surface-500">Devotees</p>
                  <p className="font-semibold text-surface-700">
                    {devotees.map((d) => d.name).join(', ')}
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-xl bg-white p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Puja Fee</span>
                    <span className="text-surface-700">₹{basePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-600">Platform Fee</span>
                    <span className="text-surface-700">₹{PLATFORM_FEE}</span>
                  </div>
                  {wantsPrasad && (
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-600">Prasad Delivery</span>
                      <span className="text-surface-700">₹{PRASAD_DELIVERY_FEE}</span>
                    </div>
                  )}
                  <div className="border-t border-surface-100 pt-2">
                    <div className="flex justify-between">
                      <span className="font-bold text-surface-800">Total Amount</span>
                      <span className="text-2xl font-bold text-saffron-600">
                        ₹{totalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Payment Failed</p>
                    <p>{paymentError}</p>
                  </div>
                </div>
              )}

              {/* Trust indicators */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-surface-500">
                  <Shield className="h-3.5 w-3.5 text-tulsi-green" />
                  Secure Payment
                </span>
                <span className="flex items-center gap-1 text-xs text-surface-500">
                  <Video className="h-3.5 w-3.5 text-saffron-500" />
                  Video Proof Guaranteed
                </span>
                <span className="flex items-center gap-1 text-xs text-surface-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-ganga-blue" />
                  100% Money-Back
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-saffron-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-saffron-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Pay ₹{totalPrice.toLocaleString('en-IN')} with Razorpay
                    </>
                  )}
                </button>
              </div>

              {/* Demo payment button (for testing) */}
              <div className="mt-3 text-center">
                <button
                  onClick={handleDemoPayment}
                  disabled={paymentLoading}
                  className="text-xs text-surface-400 underline hover:text-surface-600 disabled:opacity-50"
                >
                  Demo: Simulate Successful Payment
                </button>
              </div>
            </div>

            {/* Back button */}
            <div className="flex justify-start">
              <button
                onClick={goBack}
                disabled={paymentLoading}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-surface-200 px-6 py-3 font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-surface-500">{label}</span>
      <span className="text-right font-medium text-surface-700">{value}</span>
    </div>
  );
}
