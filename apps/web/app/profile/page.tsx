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
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';

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

const languages = [
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'bn', label: 'Bengali' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'pa', label: 'Punjabi' },
];

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
  const { user, session, refreshUser } = useAuth();

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

  /**
   * Load profile data from API.
   */
  const loadProfile = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (res.ok) {
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
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
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
      const payload: Record<string, any> = {
        fullName: form.fullName.trim(),
        preferredLanguage: form.preferredLanguage,
        isNri: form.isNri,
      };

      if (form.email.trim()) payload.email = form.email.trim();
      else payload.email = null;

      if (form.gotra.trim()) payload.gotra = form.gotra.trim();
      else payload.gotra = null;

      if (form.nakshatra) payload.nakshatra = form.nakshatra;
      else payload.nakshatra = null;

      if (form.rashi) payload.rashi = form.rashi;
      else payload.rashi = null;

      if (form.locationCity.trim()) payload.locationCity = form.locationCity.trim();
      else payload.locationCity = null;

      if (form.locationState.trim()) payload.locationState = form.locationState.trim();
      else payload.locationState = null;

      if (form.isNri && form.nriCountry) payload.nriCountry = form.nriCountry;
      else payload.nriCountry = null;

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to save profile.');
        return;
      }

      setSuccess('Profile updated successfully!');
      await refreshUser();

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-800">Edit Profile</h1>
          <p className="text-surface-500 text-sm mt-1">
            Manage your personal and spiritual information
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 -mt-4">
        {/* Status messages */}
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
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <User className="w-10 h-10 text-saffron-400" />
                )}
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
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
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
                  NRI users get pricing in USD and international shipping options.
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
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-saffron-600 text-white font-semibold rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-warm-sm"
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
