'use client';

import { useState, useEffect } from 'react';
import {
  UserCircle,
  Star,
  Save,
  Loader2,
  CheckCircle2,
  IndianRupee,
  Sparkles,
  Languages,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';

interface AstrologerProfile {
  displayName: string;
  bio: string;
  experience: number;
  specialties: string[];
  languages: string[];
  pricePerMinute: number;
  rating: number;
  approved: boolean;
}

const ALL_SPECIALTIES = [
  'Vedic Astrology', 'Kundli Reading', 'Marriage Compatibility',
  'Career Guidance', 'Gemstone Recommendation', 'Vastu Shastra',
  'Numerology', 'Palmistry', 'Prashna Kundli', 'Muhurat Selection',
  'Dasha Analysis', 'Transit Prediction', 'Remedial Astrology',
];

const ALL_LANGUAGES = [
  'Hindi', 'Sanskrit', 'English', 'Tamil', 'Telugu', 'Kannada',
  'Bengali', 'Gujarati', 'Marathi', 'Malayalam', 'Punjabi',
];

const emptyProfile: AstrologerProfile = {
  displayName: '',
  bio: '',
  experience: 0,
  specialties: [],
  languages: [],
  pricePerMinute: 10,
  rating: 0,
  approved: false,
};

export default function AstrologerProfilePage() {
  return (
    <AuthGuard allowedRoles={['astrologer', 'admin']}>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<AstrologerProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.accessToken;

  useEffect(() => {
    if (!token) {
      setProfile((p) => ({ ...p, displayName: user?.fullName ?? '' }));
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/astrologer-portal/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const j = await r.json();
          if (j.profile) {
            setProfile({
              displayName: j.profile.displayName ?? user?.fullName ?? '',
              bio: j.profile.bio ?? '',
              experience: j.profile.experience ?? 0,
              specialties: j.profile.specialties ?? [],
              languages: j.profile.languages ?? [],
              pricePerMinute: Number(j.profile.pricePerMinute ?? 10),
              rating: j.profile.rating ?? 0,
              approved: j.profile.approved ?? false,
            });
          } else {
            setProfile((p) => ({ ...p, displayName: user?.fullName ?? '' }));
          }
        }
      } catch {
        // graceful
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user]);

  function updateField<K extends keyof AstrologerProfile>(key: K, value: AstrologerProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const toggleSpecialty = (s: string) =>
    updateField('specialties', profile.specialties.includes(s) ? profile.specialties.filter((x) => x !== s) : [...profile.specialties, s]);

  const toggleLanguage = (l: string) =>
    updateField('languages', profile.languages.includes(l) ? profile.languages.filter((x) => x !== l) : [...profile.languages, l]);

  const handleSave = async () => {
    if (!token) {
      setError('Not signed in');
      return;
    }
    if (!profile.displayName.trim()) {
      setError('Display name required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE_URL}/astrologer-portal/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          displayName: profile.displayName,
          bio: profile.bio || undefined,
          experience: profile.experience,
          specialties: profile.specialties,
          languages: profile.languages,
          pricePerMinute: profile.pricePerMinute,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? `Failed (${r.status})`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-purple-700"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={H1.portal}>My Profile</h1>
          <p className="text-[var(--color-text-muted)] mt-1">Manage your astrologer profile and pricing</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg bg-[#fef2e8] border border-[#f59e54] text-[#943b19]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 flex items-center gap-6">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
          <UserCircle className="w-12 h-12 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-surface-800">{profile.displayName || user?.fullName || 'Astrologer'}</h2>
          <p className="text-sm text-surface-500">{profile.experience} years experience</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-surface-700">{profile.rating.toFixed(1)}</span>
            <span className="text-xs text-surface-400">{profile.approved ? '(approved)' : '(pending approval)'}</span>
          </div>
        </div>
      </div>

      <Card title="Display Name">
        <input
          type="text"
          value={profile.displayName}
          onChange={(e) => updateField('displayName', e.target.value)}
          className="w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
      </Card>

      <Card title="Bio" icon={BookOpen}>
        <textarea
          value={profile.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          rows={4}
          placeholder="Tell devotees about your background, training, approach…"
          className="w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
        />
      </Card>

      <Card title="Experience">
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={profile.experience}
            onChange={(e) => updateField('experience', Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            className="w-24 px-3 py-2.5 border border-surface-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          <span className="text-sm text-surface-600">years</span>
        </div>
      </Card>

      <Card title="Per-Minute Rate" icon={IndianRupee}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="number"
              value={profile.pricePerMinute}
              onChange={(e) => updateField('pricePerMinute', Math.max(1, parseFloat(e.target.value) || 1))}
              min={1}
              className="w-32 pl-9 pr-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <span className="text-sm text-surface-600">per minute (chat/call)</span>
        </div>
      </Card>

      <Card title="Specialties" icon={Sparkles}>
        <div className="flex flex-wrap gap-2">
          {ALL_SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                profile.specialties.includes(s) ? 'bg-purple-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Languages" icon={Languages}>
        <div className="flex flex-wrap gap-2">
          {ALL_LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => toggleLanguage(l)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                profile.languages.includes(l) ? 'bg-blue-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
      <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />} {title}
      </h3>
      {children}
    </div>
  );
}
