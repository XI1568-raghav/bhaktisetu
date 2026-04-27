'use client';

import { useState, useEffect } from 'react';
import {
 Flame,
 Mail,
 Lock,
 User,
 ArrowRight,
 ArrowLeft,
 Loader2,
 Eye,
 EyeOff,
 CheckCircle2,
 MapPin,
 Building2,
 Clock,
 ShoppingBag,
 FileText,
 Award,
} from 'lucide-react';
import { useAuth, getRoleDashboardPath, type UserRole } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

// Map signup form's lowercase role keys to backend MarketplaceRole enum.
// devotee never reaches submitProviderProfile (early-returned), so it's
// excluded here.
const PROVIDER_ROLE_MAP: Record<Exclude<UserRole, 'devotee' | 'admin'>, string> = {
 priest: 'PANDIT',
 store_owner: 'STORE_OWNER',
 astrologer: 'ASTROLOGER',
 wellness_instructor: 'WELLNESS_INSTRUCTOR',
 gaushala_manager: 'GAUSHALA_MANAGER',
 temple_manager: 'TEMPLE_MANAGER',
};

// Translate the form's per-role field shape to the backend profile schema.
// Field names diverge between the form (UX-named: storeName, organization)
// and Prisma models (templeName, displayName, gaushalaName) — this is the
// one place where the mapping is centralised.
function buildProviderPayload(role: UserRole, form: Record<string, unknown>): Record<string, unknown> | null {
 const fullName = (form.fullName as string) || 'Unnamed';
 switch (role) {
 case 'priest':
 return {
 templeName: form.organization || null,
 experience: Number(form.experienceYears) || 0,
 specialties: form.specialties || [],
 languages: [],
 city: form.city || null,
 bio: null,
 };
 case 'store_owner':
 return {
 storeName: form.storeName || 'Unnamed Store',
 gstNumber: form.gstNumber || null,
 city: form.city || null,
 categories: form.productCategories || [],
 };
 case 'astrologer':
 return {
 displayName: fullName,
 specialties: form.specialties || [],
 experience: Number(form.experienceYears) || 0,
 languages: form.languages || [],
 };
 case 'wellness_instructor':
 // Form collects `wellnessType[]` (Yoga/Meditation/etc.) and a free-text
 // `certifications` string. Profile model has `specialties[]` +
 // `certifications[]` — so we promote the wellness type to specialties
 // and split the cert string on commas.
 return {
 displayName: fullName,
 specialties: form.wellnessType || [],
 certifications: form.certifications
 ? String(form.certifications).split(',').map((s) => s.trim()).filter(Boolean)
 : [],
 experience: Number(form.experienceYears) || 0,
 };
 case 'gaushala_manager':
 // The signup card is shared with temple_manager; the role chosen at
 // step 0 already disambiguated to gaushala_manager here.
 return {
 gaushalaName: form.organizationName || 'Unnamed Gaushala',
 city: form.city || null,
 totalCows: 0,
 description: null,
 };
 case 'temple_manager':
 return {
 templeName: form.organizationName || 'Unnamed Temple',
 city: form.city || null,
 deity: null,
 description: null,
 };
 default:
 return null;
 }
}

// ─── Role definitions ─────────────────────────────────────────────────────────

interface RoleOption {
 value: UserRole;
 label: string;
 description: string;
 icon: string;
 isProvider: boolean;
}

const roleOptions: RoleOption[] = [
 {
 value: 'devotee',
 label: 'Devotee',
 description: 'Book pujas, watch darshan, explore spiritual content',
 icon: '\u{1F64F}',
 isProvider: false,
 },
 {
 value: 'priest',
 label: 'Pandit',
 description: 'Perform pujas, manage bookings, receive payouts',
 icon: '\u{1FA94}',
 isProvider: true,
 },
 {
 value: 'store_owner',
 label: 'Store Owner',
 description: 'Sell puja items, prasad, and devotional products',
 icon: '\u{1F3EA}',
 isProvider: true,
 },
 {
 value: 'astrologer',
 label: 'Astrologer',
 description: 'Provide consultations, horoscope readings, and guidance',
 icon: '\u{1F52E}',
 isProvider: true,
 },
 {
 value: 'wellness_instructor',
 label: 'Wellness Instructor',
 description: 'Teach yoga, meditation, and vipassana sessions',
 icon: '\u{1F9D8}',
 isProvider: true,
 },
 {
 value: 'gaushala_manager',
 label: 'Gau Seva / Temple Manager',
 description: 'Manage gaushala, temple services, and darshan streaming',
 icon: '\u{1F3DB}\uFE0F',
 isProvider: true,
 },
];

// ─── Form data types ──────────────────────────────────────────────────────────

interface BaseFormData {
 fullName: string;
 email: string;
 phone: string;
 password: string;
 city: string;
}

interface PanditFormData extends BaseFormData {
 organization: string;
 experienceYears: string;
 specialties: string[];
}

interface StoreFormData extends BaseFormData {
 storeName: string;
 gstNumber: string;
 productCategories: string[];
}

interface AstrologerFormData extends BaseFormData {
 specialties: string[];
 experienceYears: string;
 languages: string[];
}

interface WellnessFormData extends BaseFormData {
 wellnessType: string[];
 certifications: string;
 experienceYears: string;
}

interface GauSevaFormData extends BaseFormData {
 organizationName: string;
 organizationType: string;
}

type FormData = BaseFormData & Partial<PanditFormData & StoreFormData & AstrologerFormData & WellnessFormData & GauSevaFormData>;

const PANDIT_SPECIALTIES = [
 'Satyanarayan Puja', 'Griha Pravesh', 'Vivah Sanskar', 'Mundan',
 'Navgraha Shanti', 'Rudrabhishek', 'Sundarkand Path', 'Havan/Yajna',
];

const STORE_CATEGORIES = [
 'Puja Samagri', 'Idols & Murtis', 'Incense & Dhoop', 'Books & Scriptures',
 'Rudraksha & Gemstones', 'Clothing & Accessories', 'Prasad & Sweets', 'Home Decor',
];

const ASTROLOGY_SPECIALTIES = ['Vedic Astrology', 'Tarot Reading', 'Numerology', 'Palmistry', 'Vastu Shastra'];
const ASTROLOGY_LANGUAGES = ['Hindi', 'English', 'Sanskrit', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati'];
const WELLNESS_TYPES = ['Yoga', 'Meditation', 'Vipassana', 'Pranayama', 'Ayurveda Wellness'];
const ORG_TYPES = ['Gaushala', 'Temple'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleArrayItem(arr: string[], item: string): string[] {
 return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

function formatPhoneDisplay(value: string): string {
 const digits = value.replace(/\D/g, '');
 if (digits.length <= 5) return digits;
 return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
}

const STORAGE_KEY = 'poojly_signup_data';

function saveToStorage(data: { role: UserRole; formData: FormData; step: number }) {
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
 } catch {
 // storage unavailable
 }
}

function loadFromStorage(): { role: UserRole; formData: FormData; step: number } | null {
 try {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (raw) return JSON.parse(raw);
 } catch {
 // storage unavailable
 }
 return null;
}

function clearStorage() {
 try {
 localStorage.removeItem(STORAGE_KEY);
 } catch {
 // storage unavailable
 }
}

// ─── Multi-select chip component ──────────────────────────────────────────────

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
 <div className="flex flex-wrap gap-2">
 {options.map((opt) => {
 const active = selected.includes(opt);
 return (
 <button
 key={opt}
 type="button"
 onClick={() => onChange(toggleArrayItem(selected, opt))}
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

// ─── Input wrapper ────────────────────────────────────────────────────────────

function FormInput({
 id,
 label,
 type = 'text',
 placeholder,
 value,
 onChange,
 icon: Icon,
 optional,
}: {
 id: string;
 label: string;
 type?: string;
 placeholder: string;
 value: string;
 onChange: (val: string) => void;
 icon?: typeof User;
 optional?: boolean;
}) {
 return (
 <div className="mb-4">
 <label htmlFor={id} className="block text-sm font-medium text-surface-700 mb-1.5">
 {label}
 {optional && <span className="text-surface-400 font-normal ml-1">(optional)</span>}
 </label>
 <div className="relative">
 {Icon && (
 <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 )}
 <input
 id={id}
 type={type}
 placeholder={placeholder}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors`}
 />
 </div>
 </div>
 );
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
 return (
 <div className="flex items-center gap-2 mb-6">
 {Array.from({ length: total }, (_, i) => (
 <div
 key={i}
 className={`h-1.5 flex-1 rounded-full transition-colors ${
 i < current ? 'bg-saffron-500' : i === current ? 'bg-saffron-300' : 'bg-surface-200'
 }`}
 />
 ))}
 </div>
 );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SignupPage() {
 const { signUpWithCredentials, isAuthenticated, user } = useAuth();

 const [step, setStep] = useState(0); // 0 = role, 1 = form, 2 = confirmation
 const [selectedRole, setSelectedRole] = useState<UserRole>('devotee');
 const [formData, setFormData] = useState<FormData>({
 fullName: '',
 email: '',
 phone: '',
 password: '',
 city: '',
 organization: '',
 experienceYears: '',
 specialties: [],
 storeName: '',
 gstNumber: '',
 productCategories: [],
 languages: [],
 wellnessType: [],
 certifications: '',
 organizationName: '',
 organizationType: 'Temple',
 });
 const [showPassword, setShowPassword] = useState(false);
 const [acceptTerms, setAcceptTerms] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [error, setError] = useState('');
 const [signupComplete, setSignupComplete] = useState(false);

 // Load saved state
 useEffect(() => {
 const saved = loadFromStorage();
 if (saved) {
 setSelectedRole(saved.role);
 setFormData((prev) => ({ ...prev, ...saved.formData }));
 // Don't restore step — let user start fresh
 }
 }, []);

 // Save state on changes
 useEffect(() => {
 if (step > 0) {
 saveToStorage({ role: selectedRole, formData, step });
 }
 }, [selectedRole, formData, step]);

 // Redirect if already authenticated
 useEffect(() => {
 if (isAuthenticated && user && !signupComplete) {
 window.location.href = getRoleDashboardPath(user.role);
 }
 }, [isAuthenticated, user, signupComplete]);

 const currentRoleOption = roleOptions.find((r) => r.value === selectedRole);
 const isProvider = currentRoleOption?.isProvider ?? false;

 const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
 setFormData((prev) => ({ ...prev, [key]: value }));
 };

 // ─── Validation ───────────────────────────────────────────────────────────

 const validateStep1 = (): boolean => {
 if (!formData.fullName.trim()) {
 setError('Please enter your full name.');
 return false;
 }
 if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
 setError('Please enter a valid email address.');
 return false;
 }
 if (formData.password.length < 6) {
 setError('Password must be at least 6 characters.');
 return false;
 }
 if (!acceptTerms) {
 setError('Please accept the Terms of Service and Privacy Policy.');
 return false;
 }

 // Role-specific validation
 switch (selectedRole) {
 case 'priest':
 if (!formData.experienceYears) {
 setError('Please enter your years of experience.');
 return false;
 }
 if (!formData.specialties?.length) {
 setError('Please select at least one specialty.');
 return false;
 }
 break;
 case 'store_owner':
 if (!formData.storeName?.trim()) {
 setError('Please enter your store name.');
 return false;
 }
 if (!formData.productCategories?.length) {
 setError('Please select at least one product category.');
 return false;
 }
 break;
 case 'astrologer':
 if (!formData.specialties?.length) {
 setError('Please select at least one specialty.');
 return false;
 }
 if (!formData.languages?.length) {
 setError('Please select at least one language.');
 return false;
 }
 break;
 case 'wellness_instructor':
 if (!formData.wellnessType?.length) {
 setError('Please select at least one wellness type.');
 return false;
 }
 break;
 case 'gaushala_manager':
 case 'temple_manager':
 if (!formData.organizationName?.trim()) {
 setError('Please enter your organization name.');
 return false;
 }
 break;
 }

 return true;
 };

 // ─── Submit ───────────────────────────────────────────────────────────────

 const handleSubmit = async () => {
 setError('');
 if (!validateStep1()) return;

 setIsSubmitting(true);

 // Store role-specific profile data in localStorage
 const profileData = {
 role: selectedRole,
 ...formData,
 signedUpAt: new Date().toISOString(),
 status: isProvider ? 'pending_approval' : 'active',
 };
 try {
 localStorage.setItem('poojly_profile_data', JSON.stringify(profileData));
 } catch {
 // storage unavailable
 }

 const result = await signUpWithCredentials({
 fullName: formData.fullName.trim(),
 email: formData.email.trim().toLowerCase(),
 phone: formData.phone.replace(/\D/g, ''),
 password: formData.password,
 role: selectedRole,
 });

 if (!result.success) {
 setIsSubmitting(false);
 setError(result.message);
 return;
 }

 // For provider roles, immediately submit the role-specific profile so
 // an admin can review it. Demo-mode tokens are accepted by the API but
 // it returns 202 + demoMode:true and skips the DB write — that's fine,
 // signup still completes and the user reaches the confirmation screen.
 if (isProvider && result.accessToken) {
 const backendRole = PROVIDER_ROLE_MAP[selectedRole as Exclude<UserRole, 'devotee' | 'admin'>];
 const payload = buildProviderPayload(selectedRole, formData as unknown as Record<string, unknown>);
 if (backendRole && payload) {
 try {
 const onboardRes = await fetch(`${API_BASE_URL}/onboarding/provider`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${result.accessToken}`,
 },
 body: JSON.stringify({ role: backendRole, data: payload }),
 });
 if (!onboardRes.ok) {
 // Account exists; profile didn't persist. Tell the user but
 // let them through — they can finish via /onboarding/[role].
 const txt = await onboardRes.text().catch(() => '');
 console.warn('[signup] onboarding/provider non-OK', onboardRes.status, txt);
 }
 } catch (err) {
 console.warn('[signup] onboarding/provider failed', err);
 }
 }
 }

 setIsSubmitting(false);
 clearStorage();
 setSignupComplete(true);
 setStep(2);
 };

 // ─── Render: Step 0 — Role selection ──────────────────────────────────────

 const renderRoleSelection = () => (
 <div className="px-6 py-6">
 <h2 className="text-base font-semibold text-surface-800 mb-1">Choose your role</h2>
 <p className="text-sm text-surface-500 mb-5">Select how you want to use Darshya</p>

 <div className="grid grid-cols-2 gap-3">
 {roleOptions.map((option) => (
 <button
 key={option.value}
 onClick={() => setSelectedRole(option.value)}
 className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
 selectedRole === option.value
 ? 'border-saffron-400 bg-saffron-50 ring-1 ring-saffron-300 shadow-sm'
 : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
 }`}
 >
 <span className="text-2xl leading-none">{option.icon}</span>
 <div className="min-w-0">
 <p className={`text-sm font-semibold ${
 selectedRole === option.value ? 'text-saffron-700' : 'text-surface-700'
 }`}>
 {option.label}
 </p>
 <p className="text-xs text-surface-500 leading-snug mt-0.5">
 {option.description}
 </p>
 </div>
 {option.isProvider && (
 <span className="absolute top-2 right-2 text-[10px] font-medium text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-md">
 Provider
 </span>
 )}
 </button>
 ))}
 </div>

 <button
 onClick={() => {
 setError('');
 setStep(1);
 }}
 className="w-full flex items-center justify-center gap-2 mt-6 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Continue as {currentRoleOption?.label}
 <ArrowRight className="w-4 h-4" />
 </button>

 <div className="mt-5 text-center">
 <p className="text-sm text-surface-500">
 Already have an account?{' '}
 <a href="/auth/login" className="text-saffron-600 font-semibold hover:text-saffron-700 transition-colors">
 Sign In
 </a>
 </p>
 </div>
 </div>
 );

 // ─── Render: Role-specific fields ─────────────────────────────────────────

 const renderRoleFields = () => {
 switch (selectedRole) {
 case 'priest':
 return (
 <>
 <FormInput
 id="organization"
 label="Temple / Organization"
 placeholder="e.g. Shri Kashi Vishwanath Mandir"
 value={formData.organization || ''}
 onChange={(v) => updateField('organization', v)}
 icon={Building2}
 optional
 />
 <FormInput
 id="experience"
 label="Years of Experience"
 type="number"
 placeholder="e.g. 10"
 value={formData.experienceYears || ''}
 onChange={(v) => updateField('experienceYears', v)}
 icon={Clock}
 />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Specialties
 </label>
 <ChipSelect
 options={PANDIT_SPECIALTIES}
 selected={formData.specialties || []}
 onChange={(v) => updateField('specialties', v)}
 />
 </div>
 <FormInput
 id="city"
 label="City"
 placeholder="e.g. Varanasi"
 value={formData.city || ''}
 onChange={(v) => updateField('city', v)}
 icon={MapPin}
 />
 </>
 );

 case 'store_owner':
 return (
 <>
 <FormInput
 id="storeName"
 label="Store Name"
 placeholder="e.g. Shri Ganesh Puja Store"
 value={formData.storeName || ''}
 onChange={(v) => updateField('storeName', v)}
 icon={ShoppingBag}
 />
 <FormInput
 id="gstNumber"
 label="GST Number"
 placeholder="e.g. 22AAAAA0000A1Z5"
 value={formData.gstNumber || ''}
 onChange={(v) => updateField('gstNumber', v)}
 icon={FileText}
 optional
 />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Product Categories
 </label>
 <ChipSelect
 options={STORE_CATEGORIES}
 selected={formData.productCategories || []}
 onChange={(v) => updateField('productCategories', v)}
 />
 </div>
 <FormInput
 id="city"
 label="City"
 placeholder="e.g. Jaipur"
 value={formData.city || ''}
 onChange={(v) => updateField('city', v)}
 icon={MapPin}
 />
 </>
 );

 case 'astrologer':
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Specialties
 </label>
 <ChipSelect
 options={ASTROLOGY_SPECIALTIES}
 selected={formData.specialties || []}
 onChange={(v) => updateField('specialties', v)}
 />
 </div>
 <FormInput
 id="experience"
 label="Years of Experience"
 type="number"
 placeholder="e.g. 8"
 value={formData.experienceYears || ''}
 onChange={(v) => updateField('experienceYears', v)}
 icon={Clock}
 />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Languages
 </label>
 <ChipSelect
 options={ASTROLOGY_LANGUAGES}
 selected={formData.languages || []}
 onChange={(v) => updateField('languages', v)}
 />
 </div>
 </>
 );

 case 'wellness_instructor':
 return (
 <>
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Wellness Type
 </label>
 <ChipSelect
 options={WELLNESS_TYPES}
 selected={formData.wellnessType || []}
 onChange={(v) => updateField('wellnessType', v)}
 />
 </div>
 <FormInput
 id="certifications"
 label="Certifications"
 placeholder="e.g. RYT-200, Vipassana Teacher"
 value={formData.certifications || ''}
 onChange={(v) => updateField('certifications', v)}
 icon={Award}
 optional
 />
 <FormInput
 id="experience"
 label="Years of Experience"
 type="number"
 placeholder="e.g. 5"
 value={formData.experienceYears || ''}
 onChange={(v) => updateField('experienceYears', v)}
 icon={Clock}
 />
 </>
 );

 case 'gaushala_manager':
 case 'temple_manager':
 return (
 <>
 <FormInput
 id="organizationName"
 label="Organization Name"
 placeholder="e.g. Shri Gau Seva Sansthan"
 value={formData.organizationName || ''}
 onChange={(v) => updateField('organizationName', v)}
 icon={Building2}
 />
 <FormInput
 id="city"
 label="City"
 placeholder="e.g. Mathura"
 value={formData.city || ''}
 onChange={(v) => updateField('city', v)}
 icon={MapPin}
 />
 <div className="mb-4">
 <label className="block text-sm font-medium text-surface-700 mb-2">
 Organization Type
 </label>
 <div className="flex gap-3">
 {ORG_TYPES.map((t) => (
 <button
 key={t}
 type="button"
 onClick={() => updateField('organizationType', t)}
 className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
 formData.organizationType === t
 ? 'bg-saffron-100 border-saffron-400 text-saffron-700'
 : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
 }`}
 >
 {t}
 </button>
 ))}
 </div>
 </div>
 </>
 );

 case 'devotee':
 default:
 return (
 <FormInput
 id="city"
 label="City"
 placeholder="e.g. Mumbai"
 value={formData.city || ''}
 onChange={(v) => updateField('city', v)}
 icon={MapPin}
 optional
 />
 );
 }
 };

 // ─── Render: Step 1 — Form ────────────────────────────────────────────────

 const renderForm = () => (
 <div className="px-6 py-6">
 <StepIndicator current={1} total={3} />

 <div className="flex items-center gap-2 mb-4">
 <span className="text-xl">{currentRoleOption?.icon}</span>
 <div>
 <h2 className="text-base font-semibold text-surface-800">
 Sign up as {currentRoleOption?.label}
 </h2>
 {isProvider && (
 <p className="text-xs text-amber-600">Provider accounts require approval</p>
 )}
 </div>
 </div>

 {error && (
 <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
 {error}
 </div>
 )}

 {/* Common fields */}
 <FormInput
 id="fullName"
 label="Full Name"
 placeholder="Enter your full name"
 value={formData.fullName}
 onChange={(v) => updateField('fullName', v)}
 icon={User}
 />

 <FormInput
 id="signupEmail"
 label="Email Address"
 type="email"
 placeholder="you@example.com"
 value={formData.email}
 onChange={(v) => updateField('email', v)}
 icon={Mail}
 />

 {/* Phone */}
 <div className="mb-4">
 <label htmlFor="signupPhone" className="block text-sm font-medium text-surface-700 mb-1.5">
 Mobile Number <span className="text-surface-400 font-normal">(optional)</span>
 </label>
 <div className="flex gap-2">
 <div className="flex items-center gap-1 px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-lg text-surface-600 text-sm font-medium shrink-0">
 +91
 </div>
 <input
 id="signupPhone"
 type="tel"
 inputMode="numeric"
 maxLength={12}
 placeholder="98765 43210"
 value={formatPhoneDisplay(formData.phone)}
 onChange={(e) => {
 const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
 updateField('phone', digits);
 }}
 className="flex-1 px-4 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
 />
 </div>
 </div>

 {/* Password */}
 <div className="mb-5">
 <label htmlFor="signupPassword" className="block text-sm font-medium text-surface-700 mb-1.5">
 Password
 </label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 id="signupPassword"
 type={showPassword ? 'text' : 'password'}
 placeholder="Min 6 characters"
 value={formData.password}
 onChange={(e) => updateField('password', e.target.value)}
 className="w-full pl-10 pr-10 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-400 transition-colors"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 {/* Divider before role fields */}
 {selectedRole !== 'devotee' && (
 <div className="relative my-5">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-surface-200" />
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-[var(--color-surface)] px-3 text-surface-400">
 {currentRoleOption?.label} details
 </span>
 </div>
 </div>
 )}

 {/* Role-specific fields */}
 {renderRoleFields()}

 {/* Terms */}
 <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
 <input
 type="checkbox"
 checked={acceptTerms}
 onChange={(e) => setAcceptTerms(e.target.checked)}
 className="mt-0.5 w-4 h-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-300"
 />
 <span className="text-xs text-surface-500 leading-relaxed">
 I agree to the{' '}
 <a href="/terms" className="text-saffron-600 hover:underline">Terms of Service</a>{' '}
 and{' '}
 <a href="/privacy" className="text-saffron-600 hover:underline">Privacy Policy</a>
 </span>
 </label>

 {/* Actions */}
 <div className="flex gap-3">
 <button
 onClick={() => {
 setError('');
 setStep(0);
 }}
 className="px-4 py-3 border border-surface-200 text-surface-600 font-medium rounded-lg hover:bg-surface-50 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 </button>
 <button
 onClick={handleSubmit}
 disabled={isSubmitting}
 className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 Creating account...
 </>
 ) : (
 <>
 Create Account
 <ArrowRight className="w-4 h-4" />
 </>
 )}
 </button>
 </div>

 <div className="mt-5 text-center">
 <p className="text-sm text-surface-500">
 Already have an account?{' '}
 <a href="/auth/login" className="text-saffron-600 font-semibold hover:text-saffron-700 transition-colors">
 Sign In
 </a>
 </p>
 </div>
 </div>
 );

 // ─── Render: Step 2 — Confirmation ────────────────────────────────────────

 const renderConfirmation = () => {
 const dashboardPath = getRoleDashboardPath(selectedRole);
 const onboardingPath = isProvider ? `/onboarding/${selectedRole}` : null;

 return (
 <div className="px-6 py-8 text-center">
 <StepIndicator current={2} total={3} />

 <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
 <CheckCircle2 className="w-8 h-8 text-green-600" />
 </div>

 <h2 className="text-lg font-semibold text-surface-800 mb-2">
 {isProvider ? 'Account Created!' : 'Welcome to Darshya!'}
 </h2>

 {isProvider ? (
 <div className="space-y-3 mb-6">
 <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
 <p className="text-sm text-amber-800 font-medium mb-1">Profile Pending Approval</p>
 <p className="text-xs text-amber-700 leading-relaxed">
 Your {currentRoleOption?.label} profile is under review. We will notify you
 at <span className="font-medium">{formData.email}</span> once approved.
 Meanwhile, complete your onboarding to speed up the process.
 </p>
 </div>
 </div>
 ) : (
 <p className="text-sm text-surface-500 mb-6">
 Your devotee account is active. Start exploring pujas, darshan, and spiritual content.
 </p>
 )}

 <div className="space-y-3">
 {onboardingPath && (
 <a
 href={onboardingPath}
 className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Complete Onboarding
 <ArrowRight className="w-4 h-4" />
 </a>
 )}
 <a
 href={dashboardPath}
 className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors ${
 onboardingPath
 ? 'border border-surface-200 text-surface-600 hover:bg-surface-50'
 : 'bg-saffron-600 text-white hover:bg-saffron-700'
 }`}
 >
 Go to Dashboard
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </div>
 );
 };

 // ─── Main render ──────────────────────────────────────────────────────────

 return (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] shadow-warm overflow-hidden">
 {/* Header */}
 <div className="bg-[#ede9e3] px-6 py-6 text-center border-b border-[var(--color-border)]">
 <div className="flex items-center justify-center gap-2 mb-2">
 <div className="w-7 h-7 bg-saffron-600/15 rounded-lg flex items-center justify-center">
 <Flame className="w-4 h-4 text-saffron-600" />
 </div>
 <span className="text-xl font-semibold text-surface-800 tracking-tight">
 Bhakti<span className="text-saffron-600">setu</span>
 </span>
 </div>
 <p className="text-surface-500 text-sm">
 {step === 0 && 'Create your account'}
 {step === 1 && `Step 2 of 3 \u2014 Your details`}
 {step === 2 && 'All set!'}
 </p>
 </div>

 {step === 0 && renderRoleSelection()}
 {step === 1 && renderForm()}
 {step === 2 && renderConfirmation()}
 </div>
 );
}
