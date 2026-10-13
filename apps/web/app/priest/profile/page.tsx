'use client';

import { useState, useEffect, useCallback } from 'react';
// DU-03: the one primary-CTA recipe. Layout-only extras in the third slot —
// never h-*, px-*, py-* or rounded-*, which is the invariant every call site holds.
import { buttonClass } from '../../../components/ui/button-recipe';
import { AvatarWithFallback } from '../../../components/AvatarWithFallback';
import {
 UserCircle,
 Star,
 CheckCircle2,
 Shield,
 Clock,
 Loader2,
 Save,
 MapPin,
 Languages,
 BookOpen,
 Calendar,
 BadgeCheck,
 XCircle,
 AlertCircle,
 Flame,
 RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import AuthGuard from '../../../components/AuthGuard';
import { H1 } from '../../../components/ui/heading-recipe';
import { UserFacingError, userFacingMessage } from '../../../lib/friendly-error';
import { placeLabel } from '../../../lib/place-label';

// ─── Types ──────────────────────────────────────────────────────

interface PriestProfile {
 id: string;
 userId: string;
 displayName: string;
 bio: string | null;
 avatarUrl: string | null;
 specializations: string[];
 languages: string[];
 experienceYears: number;
 aadhaarVerified: boolean;
 isVerified: boolean;
 verificationStatus: string;
 ratingAvg: number;
 ratingCount: number;
 commissionRate: number;
 status: string;
 user: { fullName: string; phone: string; email: string | null };
 temples: Array<{ id: string; name: string; city: string; state: string; isPrimary: boolean }>;
 stats: { totalBookings: number; completedBookings: number };
}

// PJ-06 (2026-08-13): a hardcoded `fallbackProfile` used to live here and was
// installed by a bare `catch`. Because a non-ok response threw, an ordinary
// expired session — a 401 — painted a DIFFERENT PERSON onto the signed-in
// pandit's own profile: another name, phone and email, an "approved / Aadhaar
// verified" badge, a 4.8-star history he had not earned, and two temple
// affiliations he had no connection to. The editable fields were seeded from
// the same object, so pressing Save from that state wrote a stranger's identity
// into his record. There is no honest fixture for "who is signed in" — the only
// truthful answers are the server's row, an explicit error, or a re-auth
// prompt, which is what this file now renders.

const LOGIN_HREF = `/auth/login?redirect=${encodeURIComponent('/priest/profile')}`;

const ALL_SPECIALIZATIONS = [
 'Rudrabhishek', 'Satyanarayan Katha', 'Maha Mrityunjay', 'Navgraha Puja',
 'Ganesh Puja', 'Lakshmi Puja', 'Durga Puja', 'Hanuman Puja',
 'Vivah (Marriage)', 'Griha Pravesh', 'Mundan', 'Namkaran',
 'Pitra Dosh Nivaran', 'Kaal Sarp Dosh Puja', 'Vastu Shanti',
];

const ALL_LANGUAGES = [
 'Hindi', 'Sanskrit', 'English', 'Tamil', 'Telugu', 'Kannada',
 'Bengali', 'Gujarati', 'Marathi', 'Malayalam', 'Punjabi',
];

// ─── Component ──────────────────────────────────────────────────

export default function PriestProfilePage() {
 return (
  <AuthGuard allowedRoles={['priest', 'admin']}>
   <PriestProfilePageContent />
  </AuthGuard>
 );
}

function PriestProfilePageContent() {
 const { session } = useAuth();
 const [profile, setProfile] = useState<PriestProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 // P0 #pp-06 (2026-07-09): surface server errors instead of swallowing them.
 const [saveError, setSaveError] = useState<string | null>(null);
 // PJ-06: the two honest failure states. `authExpired` is kept separate from
 // `loadError` because 401 has a different remedy (sign in again) from every
 // other failure (retry).
 const [loadError, setLoadError] = useState<string | null>(null);
 const [authExpired, setAuthExpired] = useState(false);

 // Editable fields
 const [displayName, setDisplayName] = useState('');
 const [bio, setBio] = useState('');
 const [experienceYears, setExperienceYears] = useState(0);
 const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
 const [selectedLangs, setSelectedLangs] = useState<string[]>([]);

 const fetchProfile = useCallback(async () => {
 setLoading(true);
 setLoadError(null);
 setAuthExpired(false);
 try {
 const res = await fetch(`${API_BASE_URL}/priest/profile`, {
 headers: { Authorization: `Bearer ${session?.accessToken}` },
 });
 if (res.status === 401 || res.status === 403) {
 setProfile(null);
 setAuthExpired(true);
 return;
 }
 if (!res.ok) {
 // RES-09: an HTTP status is not something a pandit can act on.
 throw new UserFacingError('Could not load your profile. Please try again.');
 }
 const data = await res.json();
 setProfile(data);
 setDisplayName(data.displayName);
 setBio(data.bio || '');
 setExperienceYears(data.experienceYears);
 setSelectedSpecs(data.specializations);
 setSelectedLangs(data.languages);
 } catch (err) {
 setProfile(null);
 setLoadError(
 err instanceof TypeError
 ? 'Could not reach Darshya. Check your connection and try again.'
 : userFacingMessage(err, 'Could not load your profile. Please try again.'),
 );
 } finally {
 setLoading(false);
 }
 }, [session]);

 useEffect(() => {
 void fetchProfile();
 }, [fetchProfile]);

 function toggleSpec(spec: string) {
 setSelectedSpecs((prev) =>
 prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
 );
 }

 function toggleLang(lang: string) {
 setSelectedLangs((prev) =>
 prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
 );
 }

 async function handleSave() {
 setSaving(true);
 setSaved(false);
 setSaveError(null);
 try {
 const res = await fetch(`${API_BASE_URL}/priest/profile`, {
 method: 'PATCH',
 headers: {
 Authorization: `Bearer ${session?.accessToken}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 displayName,
 bio,
 experienceYears,
 specializations: selectedSpecs,
 languages: selectedLangs,
 }),
 });
 if (res.ok) {
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 } else {
 // P0 #pp-06: show the server message, not a silent fail.
 let msg = 'Could not save your profile. Please try again.';
 try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
 setSaveError(msg);
 }
 } catch (err) {
 setSaveError(userFacingMessage(err, 'Network error — please retry.'));
 } finally {
 setSaving(false);
 }
 }

 function getVerificationBadge(status: string) {
 switch (status) {
 case 'approved':
 return { label: 'Verified', icon: BadgeCheck, cls: 'bg-tulsi-green-light/30 text-tulsi-green' };
 case 'pending':
 return { label: 'Pending Verification', icon: Clock, cls: 'bg-amber-100 text-amber-700' };
 case 'rejected':
 return { label: 'Verification Rejected', icon: XCircle, cls: 'bg-red-100 text-red-700' };
 default:
 return { label: status, icon: AlertCircle, cls: 'bg-surface-100 text-surface-600' };
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
 </div>
 );
 }

 // PJ-06: 401/403 has one correct remedy — re-authenticate — and the return
 // path must come back here, not drop him on the home page wondering what
 // happened.
 if (authExpired) {
 return (
 <div className="max-w-lg mx-auto py-16 text-center">
 <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
 <h1 className={H1.portal}>Your session has expired</h1>
 <p className="text-sm text-surface-500 mt-2">
 We could not confirm who you are, so we have not shown a profile. Sign in again to see
 your own details.
 </p>
 <a
 href={LOGIN_HREF}
 className={buttonClass('primary', 'md', 'mt-6')}
 >
 Sign in again
 </a>
 </div>
 );
 }

 if (!profile) {
 return (
 <div className="max-w-lg mx-auto py-16 text-center">
 <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
 <h1 className={H1.portal}>We could not load your profile</h1>
 <p className="text-sm text-surface-500 mt-2">
 {loadError ?? 'Could not load your profile. Please try again.'}
 </p>
 <button
 onClick={() => void fetchProfile()}
 className={buttonClass('primary', 'md', 'mt-6')}
 >
 <RefreshCw className="w-4 h-4" />
 Try again
 </button>
 </div>
 );
 }

 const verificationBadge = getVerificationBadge(profile.verificationStatus);
 const VerifIcon = verificationBadge.icon;

 // PJ-03: `commissionRate` is the PANDIT'S SHARE, not the platform's fee — the
 // API reads it straight off Priest.commissionRate and booking.service resolves
 // it as `priestShare`. Labelling it "Commission Rate: 80% of booking" read as
 // Darshya taking 80%. Name both sides so the number cannot be misread; derive
 // the platform take from the same value rather than printing a constant 20,
 // so a negotiated rate never shows a split that does not add to 100.
 const priestSharePct = Math.round(profile.commissionRate * 100);
 const platformTakePct = 100 - priestSharePct;

 return (
 <div className="space-y-6 max-w-3xl">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className={H1.portal}>My Profile</h1>
 <p className="text-surface-500 mt-1">Manage your priest profile and settings</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className={buttonClass('primary', 'md')}
 >
 {saving ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : saved ? (
 <CheckCircle2 className="w-4 h-4" />
 ) : (
 <Save className="w-4 h-4" />
 )}
 {saved ? 'Saved!' : 'Save Changes'}
 </button>
 </div>
 {saveError && (
 <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
 {saveError}
 </div>
 )}

 {/* Avatar & Rating */}
 <div className="bg-white rounded-xl border border-surface-100 p-6">
 <div className="flex flex-col sm:flex-row items-center gap-6">
 {/* Avatar */}
 <div className="relative">
 {/* PF-04: was a FALSY-only guard, so a present-but-dead avatar URL —
     `priests.avatar_url` is the column holding the dead
     `images.darshya.online` host — rendered as a broken-image icon on the
     pandit's own profile. The UserCircle fallback is kept exactly as it
     was; AvatarWithFallback takes it as a prop precisely so surfaces that
     do not fall back to initials keep their own presentation. */}
 <div className="w-24 h-24 bg-saffron-100 rounded-full flex items-center justify-center">
 <AvatarWithFallback
 src={profile.avatarUrl}
 width={96}
 height={96}
 alt={profile.displayName}
 className="w-24 h-24 rounded-full object-cover"
 fallback={<UserCircle className="w-14 h-14 text-saffron-400" />}
 />
 </div>
 <button className="absolute bottom-0 right-0 w-8 h-8 bg-saffron-600 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-saffron-700 transition-colors">
 +
 </button>
 </div>

 {/* Info */}
 <div className="text-center sm:text-left flex-1">
 <h2 className="text-xl font-bold text-surface-800">{profile.displayName}</h2>
 <p className="text-sm text-surface-500">{profile.user.phone}</p>
 {profile.user.email && (
 <p className="text-sm text-surface-500">{profile.user.email}</p>
 )}

 {/* Badges */}
 <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
 <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${verificationBadge.cls}`}>
 <VerifIcon className="w-3.5 h-3.5" />
 {verificationBadge.label}
 </span>
 {profile.aadhaarVerified && (
 <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
 <Shield className="w-3.5 h-3.5" />
 Aadhaar Verified
 </span>
 )}
 </div>
 </div>

 {/* Rating & Stats */}
 <div className="flex gap-6 text-center">
 <div>
 <div className="flex items-center gap-1 justify-center mb-1">
 <Star className="w-5 h-5 text-temple-gold fill-temple-gold" />
 <span className="text-xl font-bold text-surface-800">{profile.ratingAvg}</span>
 </div>
 <p className="text-xs text-surface-500">{profile.ratingCount} reviews</p>
 </div>
 <div>
 <p className="text-xl font-bold text-surface-800">{profile.stats.completedBookings}</p>
 <p className="text-xs text-surface-500">Completed</p>
 </div>
 </div>
 </div>
 </div>

 {/* Display Name */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4">Display Name</h3>
 <input
 type="text"
 value={displayName}
 onChange={(e) => setDisplayName(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 placeholder="Your display name"
 />
 </div>

 {/* Bio */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <BookOpen className="w-4 h-4 text-surface-400" />
 Bio
 </h3>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 rows={4}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 resize-none"
 placeholder="Tell devotees about your experience, training, and what makes you special..."
 />
 <p className="text-xs text-surface-400 mt-1">{bio.length}/500 characters</p>
 </div>

 {/* Experience */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Calendar className="w-4 h-4 text-surface-400" />
 Experience
 </h3>
 <div className="flex items-center gap-3">
 <input
 type="number"
 value={experienceYears}
 onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
 min={0}
 max={60}
 className="w-24 px-3 py-2.5 border border-surface-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 />
 <span className="text-sm text-surface-600">years of experience</span>
 </div>
 </div>

 {/* Specializations */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Flame className="w-4 h-4 text-surface-400" />
 Specializations
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_SPECIALIZATIONS.map((spec) => {
 const selected = selectedSpecs.includes(spec);
 return (
 <button
 key={spec}
 onClick={() => toggleSpec(spec)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected
 ? 'bg-saffron-600 text-white'
 : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {spec}
 </button>
 );
 })}
 </div>
 <p className="text-xs text-surface-400 mt-2">
 {selectedSpecs.length} selected
 </p>
 </div>

 {/* Languages */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Languages className="w-4 h-4 text-surface-400" />
 Languages
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_LANGUAGES.map((lang) => {
 const selected = selectedLangs.includes(lang);
 return (
 <button
 key={lang}
 onClick={() => toggleLang(lang)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected
 ? 'bg-blue-600 text-white'
 : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {lang}
 </button>
 );
 })}
 </div>
 <p className="text-xs text-surface-400 mt-2">
 {selectedLangs.length} selected
 </p>
 </div>

 {/* Temples */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <MapPin className="w-4 h-4 text-surface-400" />
 Associated Temples
 </h3>
 {profile.temples.length === 0 ? (
 <p className="text-sm text-surface-500">No temples associated yet.</p>
 ) : (
 <div className="space-y-3">
 {profile.temples.map((temple) => (
 <div key={temple.id} className="flex items-center gap-3 bg-surface-50 rounded-lg p-3">
 <div className="w-10 h-10 bg-saffron-100 rounded-lg flex items-center justify-center">
 <MapPin className="w-5 h-5 text-saffron-500" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-surface-800">{temple.name}</p>
 <p className="text-xs text-surface-500">{placeLabel(temple.city, temple.state)}</p>
 </div>
 {temple.isPrimary && (
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-100 text-saffron-700">
 Primary
 </span>
 )}
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Read-only info */}
 <div className="bg-surface-50 rounded-xl border border-surface-200 p-5">
 <h3 className="font-semibold text-surface-500 text-xs uppercase tracking-wider mb-3">Account Info (Read-only)</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-surface-400 text-xs">Your share of each booking</p>
 <p className="font-medium text-surface-600">
 You keep {priestSharePct}% · Darshya takes {platformTakePct}%
 </p>
 </div>
 <div>
 <p className="text-surface-400 text-xs">Account Status</p>
 <p className="font-medium text-surface-600 capitalize">{profile.status}</p>
 </div>
 <div>
 <p className="text-surface-400 text-xs">Total Bookings</p>
 <p className="font-medium text-surface-600">{profile.stats.totalBookings}</p>
 </div>
 <div>
 <p className="text-surface-400 text-xs">Completed</p>
 <p className="font-medium text-surface-600">{profile.stats.completedBookings}</p>
 </div>
 </div>
 </div>
 </div>
 );
}
