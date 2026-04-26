'use client';

export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
 ArrowRight,
 ArrowLeft,
 Upload,
 Plus,
 Trash2,
 CheckCircle2,
 Loader2,
 User,
 Clock,
 MapPin,
 IndianRupee,
 FileText,
 Building2,
 Star,
 Calendar,
 Package,
 Truck,
 Shield,
} from 'lucide-react';
import { type UserRole, getRoleDashboardPath, getRoleLabel } from '../../../lib/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingRole = 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager';

interface StepConfig {
 title: string;
 description: string;
}

interface ProductItem {
 name: string;
 price: string;
 category: string;
 description: string;
}

// ─── Role step definitions ────────────────────────────────────────────────────

const ROLE_STEPS: Record<OnboardingRole, StepConfig[]> = {
 priest: [
 { title: 'Personal Details', description: 'Name, photo, and bio' },
 { title: 'Experience & Specialties', description: 'Pujas offered, years, temples' },
 { title: 'Pricing & Availability', description: 'Per-puja rates and calendar' },
 { title: 'Verification', description: 'Aadhaar and certificate upload' },
 { title: 'Review & Submit', description: 'Confirm your profile' },
 ],
 store_owner: [
 { title: 'Store Details', description: 'Name, logo, description, GST' },
 { title: 'Add Products', description: 'Your product catalog' },
 { title: 'Shipping & Policies', description: 'Regions, returns, delivery' },
 { title: 'Review & Submit', description: 'Confirm your store' },
 ],
 astrologer: [
 { title: 'Profile', description: 'Name, photo, bio, languages' },
 { title: 'Specialties & Pricing', description: 'Services and per-minute rates' },
 { title: 'Availability', description: 'Time slots and schedule' },
 { title: 'Review & Submit', description: 'Confirm your profile' },
 ],
 wellness_instructor: [
 { title: 'Profile', description: 'Name, photo, bio, certifications' },
 { title: 'Services', description: 'Types, session pricing' },
 { title: 'Schedule', description: 'Available slots, group vs private' },
 { title: 'Review & Submit', description: 'Confirm your profile' },
 ],
 gaushala_manager: [
 { title: 'Organization Details', description: 'Name, location, photos' },
 { title: 'Services Offered', description: 'Darshan, puja, cow adoption' },
 { title: 'Pricing & Capacity', description: 'Rates and limits' },
 { title: 'Review & Submit', description: 'Confirm your organization' },
 ],
 temple_manager: [
 { title: 'Organization Details', description: 'Name, location, photos' },
 { title: 'Services Offered', description: 'Darshan streaming, puja booking' },
 { title: 'Pricing & Capacity', description: 'Rates and limits' },
 { title: 'Review & Submit', description: 'Confirm your organization' },
 ],
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function getStorageKey(role: string): string {
 return `poojly_onboarding_${role}`;
}

function saveOnboardingData(role: string, data: Record<string, unknown>) {
 try {
 localStorage.setItem(getStorageKey(role), JSON.stringify(data));
 } catch {
 // storage unavailable
 }
}

function loadOnboardingData(role: string): Record<string, unknown> {
 try {
 const raw = localStorage.getItem(getStorageKey(role));
 if (raw) return JSON.parse(raw);
 } catch {
 // storage unavailable
 }
 return {};
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
 const pct = ((current + 1) / total) * 100;
 return (
 <div className="mb-8">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-medium text-surface-700">
 Step {current + 1} of {total}
 </span>
 <span className="text-xs text-surface-400">
 {Math.round(pct)}% complete
 </span>
 </div>
 <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-saffron-500 to-saffron-600 rounded-full transition-all duration-500"
 style={{ width: `${pct}%` }}
 />
 </div>
 <div className="flex mt-3 gap-1">
 {Array.from({ length: total }, (_, i) => (
 <div key={i} className="flex-1 flex flex-col items-center">
 <div
 className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
 i < current
 ? 'bg-saffron-500 text-white'
 : i === current
 ? 'bg-saffron-100 text-saffron-700 ring-2 ring-saffron-400'
 : 'bg-surface-100 text-surface-400'
 }`}
 >
 {i < current ? (
 <CheckCircle2 className="w-3.5 h-3.5" />
 ) : (
 i + 1
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function FormInput({
 id,
 label,
 type = 'text',
 placeholder,
 value,
 onChange,
 icon: Icon,
 optional,
 multiline,
}: {
 id: string;
 label: string;
 type?: string;
 placeholder: string;
 value: string;
 onChange: (val: string) => void;
 icon?: typeof User;
 optional?: boolean;
 multiline?: boolean;
}) {
 return (
 <div className="mb-4">
 <label htmlFor={id} className="block text-sm font-medium text-surface-700 mb-1.5">
 {label}
 {optional && <span className="text-surface-400 font-normal ml-1">(optional)</span>}
 </label>
 <div className="relative">
 {Icon && !multiline && (
 <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 )}
 {multiline ? (
 <textarea
 id={id}
 rows={3}
 placeholder={placeholder}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="w-full px-4 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors resize-none"
 />
 ) : (
 <input
 id={id}
 type={type}
 placeholder={placeholder}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors`}
 />
 )}
 </div>
 </div>
 );
}

function ChipSelect({
 options,
 selected,
 onChange,
}: {
 options: string[];
 selected: string[];
 onChange: (val: string[]) => void;
}) {
 return (
 <div className="flex flex-wrap gap-2 mb-4">
 {options.map((opt) => {
 const active = selected.includes(opt);
 return (
 <button
 key={opt}
 type="button"
 onClick={() =>
 onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
 }
 className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
 active
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {opt}
 </button>
 );
 })}
 </div>
 );
}

function FileUploadPlaceholder({ label }: { label: string }) {
 return (
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
 <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center hover:border-saffron-300 transition-colors cursor-pointer">
 <Upload className="w-8 h-8 mx-auto text-surface-300 mb-2" />
 <p className="text-sm text-surface-500">Click to upload or drag and drop</p>
 <p className="text-xs text-surface-400 mt-1">PNG, JPG up to 5MB</p>
 </div>
 </div>
 );
}

function SummaryRow({ label, value }: { label: string; value: string | string[] }) {
 const display = Array.isArray(value) ? value.join(', ') : value;
 if (!display) return null;
 return (
 <div className="flex justify-between py-2 border-b border-surface-100 last:border-0">
 <span className="text-sm text-surface-500">{label}</span>
 <span className="text-sm font-medium text-surface-800 text-right max-w-[60%]">{display}</span>
 </div>
 );
}

// ─── Time slot selector ───────────────────────────────────────────────────────

const TIME_SLOTS = [
 '06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00',
 '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00',
 '18:00 - 20:00', '20:00 - 22:00',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AvailabilityGrid({
 selected,
 onChange,
}: {
 selected: string[];
 onChange: (val: string[]) => void;
}) {
 const toggle = (slot: string) => {
 onChange(
 selected.includes(slot)
 ? selected.filter((s) => s !== slot)
 : [...selected, slot]
 );
 };

 return (
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Available Time Slots</label>
 <div className="grid grid-cols-2 gap-2">
 {TIME_SLOTS.map((slot) => {
 const active = selected.includes(slot);
 return (
 <button
 key={slot}
 type="button"
 onClick={() => toggle(slot)}
 className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
 active
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {slot}
 </button>
 );
 })}
 </div>
 </div>
 );
}

function DaysSelector({
 selected,
 onChange,
}: {
 selected: string[];
 onChange: (val: string[]) => void;
}) {
 const toggle = (day: string) => {
 onChange(
 selected.includes(day)
 ? selected.filter((d) => d !== day)
 : [...selected, day]
 );
 };

 return (
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Available Days</label>
 <div className="flex gap-2">
 {DAYS.map((day) => {
 const active = selected.includes(day);
 return (
 <button
 key={day}
 type="button"
 onClick={() => toggle(day)}
 className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
 active
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {day}
 </button>
 );
 })}
 </div>
 </div>
 );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PANDIT_PUJAS = [
 'Satyanarayan Puja', 'Griha Pravesh', 'Vivah Sanskar', 'Mundan',
 'Navgraha Shanti', 'Rudrabhishek', 'Sundarkand Path', 'Havan/Yajna',
 'Ganesh Puja', 'Lakshmi Puja', 'Mahamrityunjaya Jaap', 'Kaal Sarp Dosh',
];

const ASTROLOGY_TYPES = ['Vedic Astrology', 'Tarot Reading', 'Numerology', 'Palmistry', 'Vastu Shastra'];
const LANGUAGES = ['Hindi', 'English', 'Sanskrit', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati'];
const WELLNESS_TYPES = ['Yoga', 'Meditation', 'Vipassana', 'Pranayama', 'Ayurveda Wellness'];
const PRODUCT_CATEGORIES = [
 'Puja Samagri', 'Idols & Murtis', 'Incense & Dhoop', 'Books & Scriptures',
 'Rudraksha & Gemstones', 'Clothing', 'Prasad & Sweets', 'Home Decor',
];
const SHIPPING_REGIONS = ['Local City', 'State-wide', 'Pan India', 'International'];
const GAUSHALA_SERVICES = ['Cow Feeding', 'Cow Adoption', 'Gau Daan', 'Visit Booking', 'Live Streaming'];
const TEMPLE_SERVICES = ['Darshan Streaming', 'Puja Booking', 'Prasad Delivery', 'Chadhava', 'Special Event Booking'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
 const params = useParams();
 const roleParam = params.role as string;

 // Normalize role
 const role: OnboardingRole | null = (() => {
 const valid: OnboardingRole[] = ['priest', 'store_owner', 'astrologer', 'wellness_instructor', 'gaushala_manager', 'temple_manager'];
 if (valid.includes(roleParam as OnboardingRole)) return roleParam as OnboardingRole;
 // Handle URL-friendly variants
 const map: Record<string, OnboardingRole> = {
 pandit: 'priest',
 store: 'store_owner',
 'store-owner': 'store_owner',
 astro: 'astrologer',
 wellness: 'wellness_instructor',
 'wellness-instructor': 'wellness_instructor',
 gaushala: 'gaushala_manager',
 'gaushala-manager': 'gaushala_manager',
 temple: 'temple_manager',
 'temple-manager': 'temple_manager',
 };
 return map[roleParam] || null;
 })();

 const steps = role ? ROLE_STEPS[role] : [];
 const totalSteps = steps.length;

 const [currentStep, setCurrentStep] = useState(0);
 const [data, setData] = useState<Record<string, unknown>>({});
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSubmitted, setIsSubmitted] = useState(false);

 // Load saved data
 useEffect(() => {
 if (role) {
 const saved = loadOnboardingData(role);
 if (Object.keys(saved).length > 0) {
 setData(saved);
 }
 }
 }, [role]);

 // Persist on change
 useEffect(() => {
 if (role && Object.keys(data).length > 0) {
 saveOnboardingData(role, data);
 }
 }, [data, role]);

 const updateData = useCallback((key: string, value: unknown) => {
 setData((prev) => ({ ...prev, [key]: value }));
 }, []);

 const getString = (key: string): string => (data[key] as string) || '';
 const getArray = (key: string): string[] => (data[key] as string[]) || [];
 const getProducts = (): ProductItem[] => (data['products'] as ProductItem[]) || [];

 const goNext = () => {
 if (currentStep < totalSteps - 1) setCurrentStep((s) => s + 1);
 };
 const goBack = () => {
 if (currentStep > 0) setCurrentStep((s) => s - 1);
 };

 const handleSubmit = async () => {
 setIsSubmitting(true);
 // Simulate API submission
 await new Promise((resolve) => setTimeout(resolve, 1500));

 try {
 localStorage.setItem(
 `poojly_onboarding_${role}_submitted`,
 JSON.stringify({ ...data, submittedAt: new Date().toISOString(), status: 'pending_review' })
 );
 localStorage.removeItem(getStorageKey(role!));
 } catch {
 // storage unavailable
 }

 setIsSubmitting(false);
 setIsSubmitted(true);
 };

 // ─── Invalid role ─────────────────────────────────────────────────────────

 if (!role) {
 return (
 <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 max-w-md text-center">
 <h1 className="text-lg font-semibold text-surface-800 mb-2">Invalid Role</h1>
 <p className="text-sm text-surface-500 mb-4">
 The onboarding page for &quot;{roleParam}&quot; does not exist.
 </p>
 <a
 href="/auth/signup"
 className="inline-flex items-center gap-2 px-4 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Go to Signup
 </a>
 </div>
 </div>
 );
 }

 // ─── Submitted state ──────────────────────────────────────────────────────

 if (isSubmitted) {
 const dashPath = getRoleDashboardPath(role as UserRole);
 return (
 <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 max-w-md text-center shadow-warm">
 <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
 <CheckCircle2 className="w-8 h-8 text-green-600" />
 </div>
 <h2 className="text-lg font-semibold text-surface-800 mb-2">
 Submitted for Approval
 </h2>
 <p className="text-sm text-surface-500 mb-6">
 Your {getRoleLabel(role as UserRole)} profile has been submitted. Our team will review
 it within 24-48 hours. You will receive an email notification once approved.
 </p>
 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
 <p className="text-sm text-amber-800 font-medium">Profile Under Review</p>
 <p className="text-xs text-amber-700 mt-1">
 You can access your dashboard, but some features will be locked until approval.
 </p>
 </div>
 <a
 href={dashPath}
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Go to Dashboard
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </div>
 );
 }

 // ─── Step renderers ───────────────────────────────────────────────────────

 const renderPriestStep = () => {
 switch (currentStep) {
 case 0:
 return (
 <>
 <FormInput id="displayName" label="Display Name" placeholder="e.g. Pandit Ramesh Sharma" value={getString('displayName')} onChange={(v) => updateData('displayName', v)} icon={User} />
 <FileUploadPlaceholder label="Profile Photo" />
 <FormInput id="bio" label="Bio" placeholder="Tell devotees about yourself, your training, and your spiritual journey..." value={getString('bio')} onChange={(v) => updateData('bio', v)} multiline />
 <FormInput id="city" label="City" placeholder="e.g. Varanasi" value={getString('city')} onChange={(v) => updateData('city', v)} icon={MapPin} />
 </>
 );
 case 1:
 return (
 <>
 <FormInput id="experienceYears" label="Years of Experience" type="number" placeholder="e.g. 15" value={getString('experienceYears')} onChange={(v) => updateData('experienceYears', v)} icon={Clock} />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Pujas You Offer</label>
 <ChipSelect options={PANDIT_PUJAS} selected={getArray('pujasOffered')} onChange={(v) => updateData('pujasOffered', v)} />
 </div>
 <FormInput id="templesServed" label="Temples Served" placeholder="e.g. Kashi Vishwanath, Mahakaleshwar" value={getString('templesServed')} onChange={(v) => updateData('templesServed', v)} icon={Building2} optional />
 </>
 );
 case 2:
 return (
 <>
 <FormInput id="basePricePerPuja" label="Base Price per Puja (INR)" type="number" placeholder="e.g. 1100" value={getString('basePricePerPuja')} onChange={(v) => updateData('basePricePerPuja', v)} icon={IndianRupee} />
 <FormInput id="premiumPrice" label="Premium Puja Price (INR)" type="number" placeholder="e.g. 5100" value={getString('premiumPrice')} onChange={(v) => updateData('premiumPrice', v)} icon={IndianRupee} optional />
 <DaysSelector selected={getArray('availableDays')} onChange={(v) => updateData('availableDays', v)} />
 <AvailabilityGrid selected={getArray('availableSlots')} onChange={(v) => updateData('availableSlots', v)} />
 </>
 );
 case 3:
 return (
 <>
 <FileUploadPlaceholder label="Aadhaar Card (Front & Back)" />
 <FileUploadPlaceholder label="Priesthood Certificate / Qualification" />
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
 <p className="text-sm text-blue-800 font-medium">Why verification?</p>
 <p className="text-xs text-blue-700 mt-1">
 Aadhaar verification is required for payouts. Certificates help build trust with devotees.
 All documents are stored securely and only used for verification.
 </p>
 </div>
 </>
 );
 case 4:
 return (
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-surface-700 mb-3">Profile Summary</h3>
 <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
 <SummaryRow label="Name" value={getString('displayName')} />
 <SummaryRow label="City" value={getString('city')} />
 <SummaryRow label="Experience" value={getString('experienceYears') ? `${getString('experienceYears')} years` : ''} />
 <SummaryRow label="Pujas Offered" value={getArray('pujasOffered')} />
 <SummaryRow label="Temples" value={getString('templesServed')} />
 <SummaryRow label="Base Price" value={getString('basePricePerPuja') ? `INR ${getString('basePricePerPuja')}` : ''} />
 <SummaryRow label="Available Days" value={getArray('availableDays')} />
 <SummaryRow label="Time Slots" value={getArray('availableSlots')} />
 </div>
 </div>
 );
 default:
 return null;
 }
 };

 const renderStoreStep = () => {
 const products = getProducts();

 const addProduct = () => {
 updateData('products', [...products, { name: '', price: '', category: '', description: '' }]);
 };
 const removeProduct = (idx: number) => {
 updateData('products', products.filter((_, i) => i !== idx));
 };
 const updateProduct = (idx: number, field: keyof ProductItem, value: string) => {
 const updated = [...products];
 const existing = updated[idx];
 if (existing) {
 updated[idx] = { ...existing, [field]: value };
 updateData('products', updated);
 }
 };

 switch (currentStep) {
 case 0:
 return (
 <>
 <FormInput id="storeName" label="Store Name" placeholder="e.g. Shri Ganesh Puja Store" value={getString('storeName')} onChange={(v) => updateData('storeName', v)} icon={Building2} />
 <FileUploadPlaceholder label="Store Logo" />
 <FormInput id="storeDescription" label="Store Description" placeholder="Tell customers about your store and what you sell..." value={getString('storeDescription')} onChange={(v) => updateData('storeDescription', v)} multiline />
 <FormInput id="gstNumber" label="GST Number" placeholder="e.g. 22AAAAA0000A1Z5" value={getString('gstNumber')} onChange={(v) => updateData('gstNumber', v)} icon={FileText} optional />
 </>
 );
 case 1:
 return (
 <>
 <div className="flex items-center justify-between mb-4">
 <label className="text-sm font-medium text-surface-700">Products</label>
 <button
 type="button"
 onClick={addProduct}
 className="flex items-center gap-1 px-3 py-1.5 bg-saffron-100 text-saffron-700 rounded-lg text-xs font-medium hover:bg-saffron-200 transition-colors"
 >
 <Plus className="w-3.5 h-3.5" />
 Add Product
 </button>
 </div>
 {products.length === 0 && (
 <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center mb-4">
 <Package className="w-8 h-8 mx-auto text-surface-300 mb-2" />
 <p className="text-sm text-surface-500">No products added yet</p>
 <button
 type="button"
 onClick={addProduct}
 className="mt-2 text-sm text-saffron-600 font-medium hover:text-saffron-700"
 >
 Add your first product
 </button>
 </div>
 )}
 {products.map((product, idx) => (
 <div key={idx} className="bg-surface-50 rounded-xl p-4 border border-surface-100 mb-3">
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs font-medium text-surface-500">Product {idx + 1}</span>
 <button
 type="button"
 onClick={() => removeProduct(idx)}
 className="text-red-400 hover:text-red-600 transition-colors"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <input
 placeholder="Product name"
 value={product.name}
 onChange={(e) => updateProduct(idx, 'name', e.target.value)}
 className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400"
 />
 </div>
 <div>
 <input
 placeholder="Price (INR)"
 type="number"
 value={product.price}
 onChange={(e) => updateProduct(idx, 'price', e.target.value)}
 className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400"
 />
 </div>
 </div>
 <select
 value={product.category}
 onChange={(e) => updateProduct(idx, 'category', e.target.value)}
 className="w-full mt-3 px-3 py-2 border border-surface-200 rounded-lg text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400"
 >
 <option value="">Select category</option>
 {PRODUCT_CATEGORIES.map((cat) => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>
 ))}
 </>
 );
 case 2:
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Shipping Regions</label>
 <ChipSelect options={SHIPPING_REGIONS} selected={getArray('shippingRegions')} onChange={(v) => updateData('shippingRegions', v)} />
 </div>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Return Policy</label>
 <div className="flex gap-3">
 {['7 Days', '15 Days', '30 Days', 'No Returns'].map((opt) => (
 <button
 key={opt}
 type="button"
 onClick={() => updateData('returnPolicy', opt)}
 className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
 getString('returnPolicy') === opt
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {opt}
 </button>
 ))}
 </div>
 </div>
 <FormInput id="deliveryTime" label="Estimated Delivery Time" placeholder="e.g. 3-5 business days" value={getString('deliveryTime')} onChange={(v) => updateData('deliveryTime', v)} icon={Truck} />
 </>
 );
 case 3:
 return (
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-surface-700 mb-3">Store Summary</h3>
 <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
 <SummaryRow label="Store Name" value={getString('storeName')} />
 <SummaryRow label="GST" value={getString('gstNumber')} />
 <SummaryRow label="Products" value={`${products.length} product(s)`} />
 <SummaryRow label="Shipping" value={getArray('shippingRegions')} />
 <SummaryRow label="Return Policy" value={getString('returnPolicy')} />
 <SummaryRow label="Delivery Time" value={getString('deliveryTime')} />
 </div>
 </div>
 );
 default:
 return null;
 }
 };

 const renderAstrologerStep = () => {
 switch (currentStep) {
 case 0:
 return (
 <>
 <FormInput id="displayName" label="Display Name" placeholder="e.g. Jyotishi Suresh Kumar" value={getString('displayName')} onChange={(v) => updateData('displayName', v)} icon={User} />
 <FileUploadPlaceholder label="Profile Photo" />
 <FormInput id="bio" label="Bio" placeholder="Share your background, training, and approach to astrology..." value={getString('bio')} onChange={(v) => updateData('bio', v)} multiline />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Languages</label>
 <ChipSelect options={LANGUAGES} selected={getArray('languages')} onChange={(v) => updateData('languages', v)} />
 </div>
 </>
 );
 case 1:
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Specialties</label>
 <ChipSelect options={ASTROLOGY_TYPES} selected={getArray('specialties')} onChange={(v) => updateData('specialties', v)} />
 </div>
 <FormInput id="experienceYears" label="Years of Experience" type="number" placeholder="e.g. 12" value={getString('experienceYears')} onChange={(v) => updateData('experienceYears', v)} icon={Clock} />
 <FormInput id="perMinuteRate" label="Per-Minute Rate (INR)" type="number" placeholder="e.g. 15" value={getString('perMinuteRate')} onChange={(v) => updateData('perMinuteRate', v)} icon={IndianRupee} />
 <FormInput id="sessionRate" label="Per-Session Rate (INR)" type="number" placeholder="e.g. 500" value={getString('sessionRate')} onChange={(v) => updateData('sessionRate', v)} icon={IndianRupee} optional />
 </>
 );
 case 2:
 return (
 <>
 <DaysSelector selected={getArray('availableDays')} onChange={(v) => updateData('availableDays', v)} />
 <AvailabilityGrid selected={getArray('availableSlots')} onChange={(v) => updateData('availableSlots', v)} />
 </>
 );
 case 3:
 return (
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-surface-700 mb-3">Profile Summary</h3>
 <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
 <SummaryRow label="Name" value={getString('displayName')} />
 <SummaryRow label="Specialties" value={getArray('specialties')} />
 <SummaryRow label="Experience" value={getString('experienceYears') ? `${getString('experienceYears')} years` : ''} />
 <SummaryRow label="Languages" value={getArray('languages')} />
 <SummaryRow label="Per-Minute Rate" value={getString('perMinuteRate') ? `INR ${getString('perMinuteRate')}/min` : ''} />
 <SummaryRow label="Available Days" value={getArray('availableDays')} />
 <SummaryRow label="Time Slots" value={getArray('availableSlots')} />
 </div>
 </div>
 );
 default:
 return null;
 }
 };

 const renderWellnessStep = () => {
 switch (currentStep) {
 case 0:
 return (
 <>
 <FormInput id="displayName" label="Display Name" placeholder="e.g. Yoga Guru Ananya" value={getString('displayName')} onChange={(v) => updateData('displayName', v)} icon={User} />
 <FileUploadPlaceholder label="Profile Photo" />
 <FormInput id="bio" label="Bio" placeholder="Share your wellness journey and teaching philosophy..." value={getString('bio')} onChange={(v) => updateData('bio', v)} multiline />
 <FormInput id="certifications" label="Certifications" placeholder="e.g. RYT-200, Vipassana Teacher Training" value={getString('certifications')} onChange={(v) => updateData('certifications', v)} icon={Star} />
 </>
 );
 case 1:
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Wellness Types</label>
 <ChipSelect options={WELLNESS_TYPES} selected={getArray('wellnessTypes')} onChange={(v) => updateData('wellnessTypes', v)} />
 </div>
 <FormInput id="experienceYears" label="Years of Experience" type="number" placeholder="e.g. 8" value={getString('experienceYears')} onChange={(v) => updateData('experienceYears', v)} icon={Clock} />
 <FormInput id="groupSessionPrice" label="Group Session Price (INR)" type="number" placeholder="e.g. 300" value={getString('groupSessionPrice')} onChange={(v) => updateData('groupSessionPrice', v)} icon={IndianRupee} />
 <FormInput id="privateSessionPrice" label="Private Session Price (INR)" type="number" placeholder="e.g. 1500" value={getString('privateSessionPrice')} onChange={(v) => updateData('privateSessionPrice', v)} icon={IndianRupee} />
 </>
 );
 case 2:
 return (
 <>
 <DaysSelector selected={getArray('availableDays')} onChange={(v) => updateData('availableDays', v)} />
 <AvailabilityGrid selected={getArray('availableSlots')} onChange={(v) => updateData('availableSlots', v)} />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Session Mode</label>
 <div className="flex gap-3">
 {['Group Only', 'Private Only', 'Both'].map((mode) => (
 <button
 key={mode}
 type="button"
 onClick={() => updateData('sessionMode', mode)}
 className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
 getString('sessionMode') === mode
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {mode}
 </button>
 ))}
 </div>
 </div>
 </>
 );
 case 3:
 return (
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-surface-700 mb-3">Profile Summary</h3>
 <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
 <SummaryRow label="Name" value={getString('displayName')} />
 <SummaryRow label="Certifications" value={getString('certifications')} />
 <SummaryRow label="Wellness Types" value={getArray('wellnessTypes')} />
 <SummaryRow label="Experience" value={getString('experienceYears') ? `${getString('experienceYears')} years` : ''} />
 <SummaryRow label="Group Price" value={getString('groupSessionPrice') ? `INR ${getString('groupSessionPrice')}` : ''} />
 <SummaryRow label="Private Price" value={getString('privateSessionPrice') ? `INR ${getString('privateSessionPrice')}` : ''} />
 <SummaryRow label="Session Mode" value={getString('sessionMode')} />
 <SummaryRow label="Available Days" value={getArray('availableDays')} />
 </div>
 </div>
 );
 default:
 return null;
 }
 };

 const renderGaushalaTempleStep = () => {
 const isTemple = role === 'temple_manager';
 const services = isTemple ? TEMPLE_SERVICES : GAUSHALA_SERVICES;

 switch (currentStep) {
 case 0:
 return (
 <>
 <FormInput
 id="orgName"
 label={isTemple ? 'Temple Name' : 'Gaushala Name'}
 placeholder={isTemple ? 'e.g. Shri Kashi Vishwanath Mandir' : 'e.g. Shri Gau Seva Sansthan'}
 value={getString('orgName')}
 onChange={(v) => updateData('orgName', v)}
 icon={Building2}
 />
 <FormInput id="orgLocation" label="Location" placeholder="Full address" value={getString('orgLocation')} onChange={(v) => updateData('orgLocation', v)} icon={MapPin} />
 <FormInput id="orgCity" label="City" placeholder="e.g. Mathura" value={getString('orgCity')} onChange={(v) => updateData('orgCity', v)} icon={MapPin} />
 <FileUploadPlaceholder label="Organization Photos" />
 <FormInput id="orgDescription" label="Description" placeholder={`Tell visitors about your ${isTemple ? 'temple' : 'gaushala'}...`} value={getString('orgDescription')} onChange={(v) => updateData('orgDescription', v)} multiline />
 </>
 );
 case 1:
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">Services Offered</label>
 <ChipSelect options={services} selected={getArray('services')} onChange={(v) => updateData('services', v)} />
 </div>
 <FormInput
 id="serviceDescription"
 label="Additional Service Details"
 placeholder="Any special services, timings, or features..."
 value={getString('serviceDescription')}
 onChange={(v) => updateData('serviceDescription', v)}
 multiline
 optional
 />
 </>
 );
 case 2:
 return (
 <>
 {isTemple ? (
 <>
 <FormInput id="darshanPrice" label="Darshan Streaming Price (INR)" type="number" placeholder="e.g. 0 (free)" value={getString('darshanPrice')} onChange={(v) => updateData('darshanPrice', v)} icon={IndianRupee} />
 <FormInput id="pujaBookingPrice" label="Base Puja Booking Price (INR)" type="number" placeholder="e.g. 501" value={getString('pujaBookingPrice')} onChange={(v) => updateData('pujaBookingPrice', v)} icon={IndianRupee} />
 </>
 ) : (
 <>
 <FormInput id="cowFeedingPrice" label="Cow Feeding Price (INR)" type="number" placeholder="e.g. 51" value={getString('cowFeedingPrice')} onChange={(v) => updateData('cowFeedingPrice', v)} icon={IndianRupee} />
 <FormInput id="cowAdoptionPrice" label="Monthly Cow Adoption Price (INR)" type="number" placeholder="e.g. 3000" value={getString('cowAdoptionPrice')} onChange={(v) => updateData('cowAdoptionPrice', v)} icon={IndianRupee} />
 </>
 )}
 <FormInput id="dailyCapacity" label="Daily Visitor/Booking Capacity" type="number" placeholder="e.g. 500" value={getString('dailyCapacity')} onChange={(v) => updateData('dailyCapacity', v)} icon={Calendar} />
 </>
 );
 case 3:
 return (
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-surface-700 mb-3">Organization Summary</h3>
 <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
 <SummaryRow label="Name" value={getString('orgName')} />
 <SummaryRow label="Location" value={getString('orgLocation')} />
 <SummaryRow label="City" value={getString('orgCity')} />
 <SummaryRow label="Services" value={getArray('services')} />
 {isTemple ? (
 <>
 <SummaryRow label="Darshan Price" value={getString('darshanPrice') ? `INR ${getString('darshanPrice')}` : 'Free'} />
 <SummaryRow label="Puja Price" value={getString('pujaBookingPrice') ? `INR ${getString('pujaBookingPrice')}` : ''} />
 </>
 ) : (
 <>
 <SummaryRow label="Feeding Price" value={getString('cowFeedingPrice') ? `INR ${getString('cowFeedingPrice')}` : ''} />
 <SummaryRow label="Adoption Price" value={getString('cowAdoptionPrice') ? `INR ${getString('cowAdoptionPrice')}/mo` : ''} />
 </>
 )}
 <SummaryRow label="Daily Capacity" value={getString('dailyCapacity')} />
 </div>
 </div>
 );
 default:
 return null;
 }
 };

 const renderCurrentStep = () => {
 switch (role) {
 case 'priest':
 return renderPriestStep();
 case 'store_owner':
 return renderStoreStep();
 case 'astrologer':
 return renderAstrologerStep();
 case 'wellness_instructor':
 return renderWellnessStep();
 case 'gaushala_manager':
 case 'temple_manager':
 return renderGaushalaTempleStep();
 default:
 return null;
 }
 };

 const isLastStep = currentStep === totalSteps - 1;

 // ─── Main render ──────────────────────────────────────────────────────────

 return (
 <div className="min-h-screen bg-[var(--color-bg)]">
 {/* Top bar */}
 <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
 <div className="max-w-2xl mx-auto flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-lg font-semibold text-surface-800 tracking-tight">
 Bhakti<span className="text-saffron-600">setu</span>
 </span>
 </div>
 <span className="text-xs text-surface-400">
 {getRoleLabel(role as UserRole)} Onboarding
 </span>
 </div>
 </div>

 {/* Content */}
 <div className="max-w-2xl mx-auto px-4 py-8">
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-warm overflow-hidden">
 {/* Step header */}
 <div className="bg-[#ede9e3] px-6 py-5 border-b border-[var(--color-border)]">
 <h1 className="text-base font-semibold text-surface-800 mb-1">
 {steps[currentStep]?.title}
 </h1>
 <p className="text-sm text-surface-500">{steps[currentStep]?.description}</p>
 </div>

 {/* Progress */}
 <div className="px-6 pt-6">
 <ProgressBar current={currentStep} total={totalSteps} />
 </div>

 {/* Step content */}
 <div className="px-6 pb-6">
 {renderCurrentStep()}
 </div>

 {/* Navigation */}
 <div className="px-6 pb-6 flex gap-3">
 {currentStep > 0 && (
 <button
 onClick={goBack}
 className="px-4 py-3 border border-surface-200 text-surface-600 font-medium rounded-lg hover:bg-surface-50 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 </button>
 )}
 {isLastStep ? (
 <button
 onClick={handleSubmit}
 disabled={isSubmitting}
 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Submitting...
 </>
 ) : (
 <>
 <Shield className="w-4 h-4" />
 Submit for Approval
 </>
 )}
 </button>
 ) : (
 <button
 onClick={goNext}
 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Next
 <ArrowRight className="w-4 h-4" />
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
