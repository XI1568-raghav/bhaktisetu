'use client';

import { useEffect, useState, useCallback } from 'react';
import {
 User,
 Phone,
 Mail,
 MapPin,
 Globe,
 Star,
 Save,
 Loader2,
 CheckCircle2,
 Camera,
 ArrowLeft,
 Shield,
 LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthGuard from '../../components/AuthGuard';
import { AvatarWithFallback } from '../../components/AvatarWithFallback';
import AddressManager from '../../components/profile/AddressManager';
import { useAuth, type SignOutScope } from '../../lib/auth-context';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
 // AUTH-06: true ONLY for 401 — a 403 is a suspended account, where signing in
 // again succeeds and lands the user back on the same refusal.
 loadErrorIsReauth,
} from '../../lib/api-config';
import { ACCOUNT_LANGUAGES, accountLanguageLabel } from '../../lib/i18n/locales';
import { H1 } from '../../components/ui/heading-recipe';
import { buttonClass } from '../../components/ui/button-recipe';
import ReauthPrompt from '../../components/ReauthPrompt';
import { serverErrorMessage } from '../../lib/friendly-error';

interface ProfileFormData {
 fullName: string;
 email: string;
 gotra: string;
 nakshatra: string;
 rashi: string;
 preferredLanguage: string;
 locationCity: string;
 locationState: string;
 isNri: boolean;
 nriCountry: string;
}

/*
 * I18N-07: this was a hand-retyped copy of the Prisma `Language` enum — a
 * fourth list of languages in a product that already had three — and it offered
 * all ten as if all ten did something. apps/api has message catalogues for five
 * (en, hi, ta, te, kn); the other five save fine and change nothing. The list
 * and the disclosure both live in lib/i18n/locales.ts now, checked against
 * @poojly/shared by __tests__/i18n/profile-language-honesty.i18n07.test.tsx.
 */

const nakshatras = [
 'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const rashis = [
 'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)',
 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchika (Scorpio)',
 'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
];

const countries = [
 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore',
 'UAE', 'Germany', 'Netherlands', 'New Zealand', 'South Africa',
 'Malaysia', 'Kenya', 'Mauritius', 'Fiji', 'Trinidad and Tobago',
];

function ProfileContent() {
 const { user, session, refreshUser, signOut } = useAuth();
 const router = useRouter();

 // AUTH-09: which scope is in flight, so both buttons disable together and the
 // pressed one names what it is doing. `null` = idle.
 const [signingOutScope, setSigningOutScope] = useState<SignOutScope | null>(null);

 /**
  * Sign out at the scope the user explicitly chose.
  *
  * `scope` is passed EXPLICITLY here, including 'global'. Everywhere else in
  * the product the global scope is reached by omitting the field, which is
  * what keeps a bare `signOut()` safe; on this screen the user has picked one,
  * and the request should say which.
  */
 const handleSignOut = useCallback(
  async (scope: SignOutScope) => {
   setSigningOutScope(scope);
   try {
    await signOut({ scope });
   } finally {
    // Navigate whether or not the network call succeeded: auth-context clears
    // the local session in its `finally` either way, so staying on an
    // authenticated screen would render a signed-out user's profile.
    router.replace('/');
   }
  },
  [signOut, router],
 );

 const [form, setForm] = useState<ProfileFormData>({
 fullName: '',
 email: '',
 gotra: '',
 nakshatra: '',
 rashi: '',
 preferredLanguage: 'hi',
 locationCity: '',
 locationState: '',
 isNri: false,
 nriCountry: '',
 });
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [success, setSuccess] = useState('');
 const [error, setError] = useState('');
 // RES-03 (2026-08-12): THE DATA-DESTROYING PAIR.
 //
 // The loader only populated state `if (res.ok)` and the catch only did a
 // console.error, so a 500 rendered a completely BLANK form with no message.
 // handleSave then PATCHed an explicit `null` for every empty field. A devotee
 // who opened Edit Profile during a backend blip saw an empty profile, assumed
 // it was never filled in, typed her name, pressed Save — and silently
 // destroyed her gotra, nakshatra, rashi, city and email. Gotra and nakshatra
 // are load-bearing for the sankalp, so the next puja is performed with the
 // wrong ritual details and she is never told why.
 //
 // Two guards, both required: refuse to save over a form we never loaded, and
 // only ever send fields the user actually edited.
 const [loadFailed, setLoadFailed] = useState<string | null>(null);
 // AUTH-06: /profile disables Save while the load has failed, so an expired
 // session left the user with a read-only form, a sentence telling them to
 // sign in again, and a Retry that could only 401 again.
 const [loadReauth, setLoadReauth] = useState(false);
 const [touched, setTouched] = useState<Record<string, boolean>>({});

 /**
 * Load profile data from API.
 */
 const loadProfile = useCallback(async () => {
 if (!session?.accessToken) return;

 setLoadFailed(null);
 setLoadReauth(false);
 try {
 // RES-01: bare fetch has no timeout — held open, /profile sat on
 // "Loading profile..." at T+10s and at T+30s with no error.
 const res = await fetchWithTimeout(`${API_BASE_URL}/users/me`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 }, DATA_FETCH_TIMEOUT_MS);

 if (!res.ok) {
 setLoadFailed(loadErrorMessage(res));
 setLoadReauth(loadErrorIsReauth(res));
 } else {
 const data = await res.json();
 const u = data.user;
 setForm({
 fullName: u.fullName || '',
 email: u.email || '',
 gotra: u.gotra || '',
 nakshatra: u.nakshatra || '',
 rashi: u.rashi || '',
 preferredLanguage: u.preferredLanguage || 'hi',
 locationCity: u.locationCity || '',
 locationState: u.locationState || '',
 isNri: u.isNri || false,
 nriCountry: u.nriCountry || '',
 });
 setTouched({});
 }
 } catch (err) {
 setLoadFailed(loadErrorMessage(err));
 setLoadReauth(loadErrorIsReauth(err));
 } finally {
 setIsLoading(false);
 }
 }, [session?.accessToken]);

 useEffect(() => {
 loadProfile();
 }, [loadProfile]);

 /**
 * Save profile changes.
 */
 const handleSave = async () => {
 setError('');
 setSuccess('');

 // Never PATCH over a profile we never managed to read.
 if (loadFailed) {
 setError('We could not load your profile, so saving would overwrite it. Retry the load first.');
 return;
 }

 if (!form.fullName.trim()) {
 setError('Full name is required.');
 return;
 }

 if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
 setError('Please enter a valid email address.');
 return;
 }

 setIsSaving(true);

 try {
 // A TRUE partial update. Only a field the user actually edited is sent, so
 // an untouched gotra/nakshatra/rashi/city/email can never be nulled out by
 // a save the user made for an unrelated reason. The old code sent
 // `payload.gotra = null` for every empty string — which is exactly what a
 // blank form produced.
 const payload: Record<string, any> = {
 fullName: form.fullName.trim(),
 };
 if (touched.preferredLanguage) payload.preferredLanguage = form.preferredLanguage;
 if (touched.isNri) payload.isNri = form.isNri;
 if (touched.email) payload.email = form.email.trim() || null;
 if (touched.gotra) payload.gotra = form.gotra.trim() || null;
 if (touched.nakshatra) payload.nakshatra = form.nakshatra || null;
 if (touched.rashi) payload.rashi = form.rashi || null;
 if (touched.locationCity) payload.locationCity = form.locationCity.trim() || null;
 if (touched.locationState) payload.locationState = form.locationState.trim() || null;
 if (touched.nriCountry || touched.isNri) {
 payload.nriCountry = form.isNri && form.nriCountry ? form.nriCountry : null;
 }

 const res = await fetchWithTimeout(`${API_BASE_URL}/users/me`, {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session?.accessToken}`,
 },
 body: JSON.stringify(payload),
 }, DATA_FETCH_TIMEOUT_MS);

 const data = await res.json();

 if (!res.ok) {
 setError(serverErrorMessage(data, 'Failed to save profile.'));
 return;
 }

 setSuccess('Profile updated successfully!');
 await refreshUser();

 // Clear success after 3 seconds
 setTimeout(() => setSuccess(''), 3000);
 } catch (err) {
 setError(loadErrorMessage(err));
 } finally {
 setIsSaving(false);
 }
 };

 const updateField = (field: keyof ProfileFormData, value: string | boolean) => {
 setForm((prev) => ({ ...prev, [field]: value }));
 setTouched((prev) => ({ ...prev, [field]: true }));
 setSuccess('');
 };

 if (isLoading) {
 return (
 <div className="min-h-[100dvh] flex items-center justify-center bg-surface-50">
 <div className="text-center">
 <div className="w-10 h-10 border-3 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-3" />
 <p className="text-surface-400 text-sm">Loading profile...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* Header */}
 <div className="bg-[#ede9e3] border-b border-[var(--color-border)]">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
 <a
 href="/dashboard"
 className="inline-flex items-center gap-1 text-surface-500 hover:text-saffron-600 text-sm mb-4 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Dashboard
 </a>
 <h1 className={H1.portal}>Edit Profile</h1>
 <p className="text-surface-500 text-sm mt-1">
 Manage your personal and spiritual information
 </p>
 </div>
 </div>

 {/* Mobile lang switcher — 6 langs, profile-drawer surface (gap #5; desktop uses footer LanguageSwitcher) */}
 <div className="md:hidden bg-white border-b border-surface-200">
  <div className="max-w-3xl mx-auto px-4 py-3">
   <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Language</p>
   <div className="flex flex-wrap gap-2 text-sm">
    <a href="/" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100">English</a>
    <a href="/hi" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100" lang="hi">हिन्दी</a>
    <a href="/ta" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100" lang="ta">தமிழ்</a>
    <a href="/te" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100" lang="te">తెలుగు</a>
    <a href="/bn" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100" lang="bn">বাংলা</a>
    <a href="/mr" className="px-2.5 py-1 rounded-md bg-surface-100 text-surface-700 hover:bg-saffron-100" lang="mr">मराठी</a>
   </div>
  </div>
 </div>

 <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 -mt-4">
 {/* Status messages */}
 {loadFailed && (
 <div role="alert" className="mb-6 flex flex-wrap items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
 <span className="flex-1 min-w-[12rem]">
 {loadFailed} Saving is disabled until your profile loads, so a blank form
 cannot overwrite your gotra, nakshatra or city.
 </span>
 {loadReauth ? (
 <ReauthPrompt message="" className="shrink-0" />
 ) : (
 <button
 type="button"
 onClick={() => { setIsLoading(true); void loadProfile(); }}
 className="font-semibold underline underline-offset-2 hover:text-amber-900"
 >
 Retry
 </button>
 )}
 </div>
 )}
 {error && (
 <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
 {error}
 </div>
 )}
 {success && (
 <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 shrink-0" />
 {success}
 </div>
 )}

 {/* Avatar section */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
 <div className="flex items-center gap-5">
 <div className="relative">
 <div className="w-20 h-20 bg-saffron-100 rounded-full flex items-center justify-center overflow-hidden">
 {/* PF-04: was a FALSY-only guard. No seeded User row carries the dead
     `images.darshya.online` host today, but any dead avatar URL — an
     expired Supabase Storage object, a deleted OAuth provider photo —
     produces the identical broken-image icon, and this is the devotee's
     own profile page. Same wrapper, same `User` icon fallback. */}
 <AvatarWithFallback
 src={user?.avatarUrl}
 width={80}
 height={80}
 alt="Avatar"
 className="w-full h-full object-cover"
 fallback={<User className="w-10 h-10 text-saffron-400" />}
 />
 </div>
 <button
 className="absolute -bottom-1 -right-1 w-7 h-7 bg-saffron-600 rounded-full flex items-center justify-center text-white hover:bg-saffron-700 transition-colors shadow-sm"
 title="Upload avatar (coming soon)"
 >
 <Camera className="w-3.5 h-3.5" />
 </button>
 </div>
 <div>
 <h3 className="font-semibold text-surface-800">
 {form.fullName || 'Your Name'}
 </h3>
 <p className="text-sm text-surface-500">{user?.phone}</p>
 <p className="text-xs text-surface-400 mt-0.5">Avatar upload coming soon</p>
 </div>
 </div>
 </div>

 {/* Personal Information */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
 <h2 className="text-lg font-bold text-surface-800 mb-5 flex items-center gap-2">
 <User className="w-5 h-5 text-saffron-600" />
 Personal Information
 </h2>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
 {/* Full Name */}
 <div className="sm:col-span-2">
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Full Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={form.fullName}
 onChange={(e) => updateField('fullName', e.target.value)}
 placeholder="Enter your full name"
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 />
 </div>

 {/* Phone (read-only) */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Phone Number
 </label>
 <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-50 border border-[var(--color-border)] rounded-lg text-surface-500">
 <Phone className="w-4 h-4" />
 {user?.phone || 'N/A'}
 </div>
 <p className="text-xs text-surface-400 mt-1">Phone number cannot be changed</p>
 </div>

 {/* Email */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Email Address
 </label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="email"
 value={form.email}
 onChange={(e) => updateField('email', e.target.value)}
 placeholder="your@email.com"
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 />
 </div>
 </div>

 {/* Preferred Language */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Preferred Language
 </label>
 <select
 value={form.preferredLanguage}
 onChange={(e) => updateField('preferredLanguage', e.target.value)}
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 >
 {ACCOUNT_LANGUAGES.map((lang) => (
 <option key={lang.value} value={lang.value}>
 {accountLanguageLabel(lang.value)}
 </option>
 ))}
 </select>
 <p className="mt-1.5 text-xs text-surface-500">
 This sets the language of the messages we send you. Five of these have a
 full catalogue; the rest are marked, and stay English until they do.
 </p>
 </div>

 {/* Location */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">City</label>
 <div className="relative">
 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 value={form.locationCity}
 onChange={(e) => updateField('locationCity', e.target.value)}
 placeholder="e.g., Mumbai"
 className="w-full pl-10 pr-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Spiritual Information */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
 <h2 className="text-lg font-bold text-surface-800 mb-5 flex items-center gap-2">
 <Star className="w-5 h-5 text-temple-gold" />
 Spiritual Information
 </h2>
 <p className="text-sm text-surface-500 mb-5">
 Used for personalized puja recommendations and sankalp (prayer intention).
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
 {/* Gotra */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">Gotra</label>
 <input
 type="text"
 value={form.gotra}
 onChange={(e) => updateField('gotra', e.target.value)}
 placeholder="e.g., Kashyap, Bharadwaj"
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 />
 </div>

 {/* Nakshatra */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Nakshatra (Birth Star)
 </label>
 <select
 value={form.nakshatra}
 onChange={(e) => updateField('nakshatra', e.target.value)}
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 >
 <option value="">Select Nakshatra</option>
 {nakshatras.map((n) => (
 <option key={n} value={n}>
 {n}
 </option>
 ))}
 </select>
 </div>

 {/* Rashi */}
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Rashi (Moon Sign)
 </label>
 <select
 value={form.rashi}
 onChange={(e) => updateField('rashi', e.target.value)}
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 >
 <option value="">Select Rashi</option>
 {rashis.map((r) => (
 <option key={r} value={r}>
 {r}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* NRI Settings */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
 <h2 className="text-lg font-bold text-surface-800 mb-5 flex items-center gap-2">
 <Globe className="w-5 h-5 text-ganga-blue" />
 NRI Settings
 </h2>

 <div className="space-y-4">
 {/* NRI Toggle */}
 <div className="flex items-center justify-between">
 <div>
 <p className="font-medium text-surface-700">I am an NRI</p>
 <p className="text-sm text-surface-500">
 NRI users get international shipping options; billing is in INR.
 </p>
 </div>
 <button
 onClick={() => updateField('isNri', !form.isNri)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
 form.isNri ? 'bg-saffron-600' : 'bg-surface-300'
 }`}
 >
 <span
 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
 form.isNri ? 'translate-x-6' : 'translate-x-1'
 }`}
 />
 </button>
 </div>

 {/* Country selector (shown only if NRI) */}
 {form.isNri && (
 <div>
 <label className="block text-sm font-medium text-surface-600 mb-1.5">
 Country of Residence
 </label>
 <select
 value={form.nriCountry}
 onChange={(e) => updateField('nriCountry', e.target.value)}
 className="w-full px-4 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-400 transition-colors"
 >
 <option value="">Select Country</option>
 {countries.map((c) => (
 <option key={c} value={c}>
 {c}
 </option>
 ))}
 </select>
 </div>
 )}
 </div>
 </div>

 {/* Delivery Addresses (devotee revamp 2026-08-05: backend existed, no UI) */}
 <AddressManager />

 {/* AUTH-09 — Security: the one screen where the sign-out SCOPE is a choice.

     Signing out anywhere else in the product is global: POST /auth/logout
     defaults to supabase's global scope and burns every refresh_token_jtis
     row the account holds, so pressing "Sign Out" on a library computer also
     ends the session on the user's phone. That is the right default for a
     lost or shared device and it stays the default — auth-context.tsx sends
     no `scope` at all rather than sending 'global', because defaulting to
     'local' would silently stop revoking other sessions.

     But a default is not a choice, and until now there was nowhere to make
     one: `signOut({ scope })`, the API enum and the scope-naming response all
     existed with zero callers. The choice belongs HERE, on the account screen
     a user opens deliberately — not on /auth/logout, which signs out on mount
     and which every "Sign Out" affordance routes to, so a chooser there would
     turn a one-click sign-out into two and would be offered after the global
     sign-out had already run.

     Guarded by __tests__/auth09-profile-security-scopes.test.tsx. */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
 <h2 className="text-lg font-bold text-surface-800 mb-5 flex items-center gap-2">
 <Shield className="w-5 h-5 text-tulsi-green" />
 Security
 </h2>

 <div className="space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="min-w-0">
 <p className="font-medium text-surface-700">Sign out on this device</p>
 <p className="text-sm text-surface-500">
 You stay signed in on your other devices.
 </p>
 </div>
 <button
 type="button"
 onClick={() => handleSignOut('local')}
 disabled={signingOutScope !== null}
 className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 text-sm font-semibold text-surface-700 transition-colors hover:bg-surface-50 disabled:opacity-50"
 >
 <LogOut className="w-4 h-4" />
 {signingOutScope === 'local' ? 'Signing out…' : 'Sign out on this device'}
 </button>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-3">
 <div className="min-w-0">
 <p className="font-medium text-surface-700">Sign out everywhere</p>
 <p className="text-sm text-surface-500">
 Ends the session on all your devices, including your phone. Use this if a
 device was lost or shared.
 </p>
 </div>
 <button
 type="button"
 onClick={() => handleSignOut('global')}
 disabled={signingOutScope !== null}
 className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
 >
 <LogOut className="w-4 h-4" />
 {signingOutScope === 'global' ? 'Signing out…' : 'Sign out on all devices'}
 </button>
 </div>
 </div>
 </div>

 {/* Save button */}
 <div className="flex items-center justify-end gap-4">
 <a
 href="/dashboard"
 className="px-5 py-2.5 text-sm font-medium text-surface-600 hover:text-surface-700 transition-colors"
 >
 Cancel
 </a>
 <button
 onClick={handleSave}
 disabled={isSaving || !!loadFailed}
 className={buttonClass('primary', 'md', 'disabled:cursor-not-allowed shadow-warm-sm')}
 >
 {isSaving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Saving...
 </>
 ) : (
 <>
 <Save className="w-4 h-4" />
 Save Changes
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 );
}

export default function ProfilePage() {
 return (
 <AuthGuard>
 <ProfileContent />
 </AuthGuard>
 );
}
