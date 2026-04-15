'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/supabase';

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

// ─── Fallback ───────────────────────────────────────────────────

const fallbackProfile: PriestProfile = {
  id: '1',
  userId: '1',
  displayName: 'Pandit Ramesh Sharma',
  bio: 'Experienced Vedic priest with deep knowledge of Shaiva and Vaishnava traditions. Specialized in Rudrabhishek, Satyanarayan Katha, and planetary pujas. Serving devotees at Kashi Vishwanath Temple for over 15 years with dedication and devotion.',
  avatarUrl: null,
  specializations: ['Rudrabhishek', 'Satyanarayan Katha', 'Maha Mrityunjay', 'Navgraha Puja', 'Ganesh Puja'],
  languages: ['Hindi', 'Sanskrit', 'English'],
  experienceYears: 15,
  aadhaarVerified: true,
  isVerified: true,
  verificationStatus: 'approved',
  ratingAvg: 4.8,
  ratingCount: 156,
  commissionRate: 0.70,
  status: 'active',
  user: { fullName: 'Ramesh Sharma', phone: '+91 98765 43210', email: 'pandit.ramesh@email.com' },
  temples: [
    { id: '1', name: 'Shri Kashi Vishwanath Temple', city: 'Varanasi', state: 'Uttar Pradesh', isPrimary: true },
    { id: '2', name: 'Trimbakeshwar Temple', city: 'Nashik', state: 'Maharashtra', isPrimary: false },
  ],
  stats: { totalBookings: 234, completedBookings: 218 },
};

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
  const { session } = useAuth();
  const [profile, setProfile] = useState<PriestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API_BASE_URL}/priest/profile`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setDisplayName(data.displayName);
          setBio(data.bio || '');
          setExperienceYears(data.experienceYears);
          setSelectedSpecs(data.specializations);
          setSelectedLangs(data.languages);
        } else {
          throw new Error('API unavailable');
        }
      } catch {
        setProfile(fallbackProfile);
        setDisplayName(fallbackProfile.displayName);
        setBio(fallbackProfile.bio || '');
        setExperienceYears(fallbackProfile.experienceYears);
        setSelectedSpecs(fallbackProfile.specializations);
        setSelectedLangs(fallbackProfile.languages);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [session]);

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
      }
    } catch {
      // Silent fail
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
        return { label: status, icon: AlertCircle, cls: 'bg-stone-100 text-stone-600' };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    );
  }

  if (!profile) return null;

  const verificationBadge = getVerificationBadge(profile.verificationStatus);
  const VerifIcon = verificationBadge.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">My Profile</h1>
          <p className="text-stone-500 mt-1">Manage your priest profile and settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50"
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

      {/* Avatar & Rating */}
      <div className="bg-white rounded-xl border border-stone-100 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-saffron-100 rounded-full flex items-center justify-center">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="w-14 h-14 text-saffron-400" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-saffron-600 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-saffron-700 transition-colors">
              +
            </button>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-stone-900">{profile.displayName}</h2>
            <p className="text-sm text-stone-500">{profile.user.phone}</p>
            {profile.user.email && (
              <p className="text-sm text-stone-500">{profile.user.email}</p>
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
                <span className="text-xl font-bold text-stone-900">{profile.ratingAvg}</span>
              </div>
              <p className="text-xs text-stone-500">{profile.ratingCount} reviews</p>
            </div>
            <div>
              <p className="text-xl font-bold text-stone-900">{profile.stats.completedBookings}</p>
              <p className="text-xs text-stone-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4">Display Name</h3>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
          placeholder="Your display name"
        />
      </div>

      {/* Bio */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-stone-400" />
          Bio
        </h3>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 resize-none"
          placeholder="Tell devotees about your experience, training, and what makes you special..."
        />
        <p className="text-xs text-stone-400 mt-1">{bio.length}/500 characters</p>
      </div>

      {/* Experience */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-stone-400" />
          Experience
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={experienceYears}
            onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            max={60}
            className="w-24 px-3 py-2.5 border border-stone-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
          />
          <span className="text-sm text-stone-600">years of experience</span>
        </div>
      </div>

      {/* Specializations */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-stone-400" />
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
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {spec}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 mt-2">
          {selectedSpecs.length} selected
        </p>
      </div>

      {/* Languages */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <Languages className="w-4 h-4 text-stone-400" />
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
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-400 mt-2">
          {selectedLangs.length} selected
        </p>
      </div>

      {/* Temples */}
      <div className="bg-white rounded-xl border border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-stone-400" />
          Associated Temples
        </h3>
        {profile.temples.length === 0 ? (
          <p className="text-sm text-stone-500">No temples associated yet.</p>
        ) : (
          <div className="space-y-3">
            {profile.temples.map((temple) => (
              <div key={temple.id} className="flex items-center gap-3 bg-stone-50 rounded-lg p-3">
                <div className="w-10 h-10 bg-saffron-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-saffron-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{temple.name}</p>
                  <p className="text-xs text-stone-500">{temple.city}, {temple.state}</p>
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
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <h3 className="font-semibold text-stone-500 text-xs uppercase tracking-wider mb-3">Account Info (Read-only)</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-stone-400 text-xs">Commission Rate</p>
            <p className="font-medium text-stone-700">{(profile.commissionRate * 100).toFixed(0)}% of booking</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs">Account Status</p>
            <p className="font-medium text-stone-700 capitalize">{profile.status}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs">Total Bookings</p>
            <p className="font-medium text-stone-700">{profile.stats.totalBookings}</p>
          </div>
          <div>
            <p className="text-stone-400 text-xs">Completed</p>
            <p className="font-medium text-stone-700">{profile.stats.completedBookings}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
