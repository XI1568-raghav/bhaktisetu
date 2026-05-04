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
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface AstrologerProfile {
 displayName: string;
 bio: string;
 experienceYears: number;
 specialties: string[];
 languages: string[];
 perMinuteRate: number;
 consultationTypes: { name: string; rate: number; duration: number }[];
}

const STORAGE_KEY = 'poojly_astrologer_profile';

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

const defaultProfile: AstrologerProfile = {
 displayName: 'Acharya Vikram Shastri',
 bio: 'Third-generation Vedic astrologer with expertise in Parashari and Jaimini systems. Specializing in career guidance, marriage compatibility, and gemstone recommendations. Studied under Guru Shri Narayan Jyotish Peeth, Varanasi.',
 experienceYears: 18,
 specialties: ['Vedic Astrology', 'Kundli Reading', 'Marriage Compatibility', 'Career Guidance', 'Gemstone Recommendation', 'Dasha Analysis'],
 languages: ['Hindi', 'Sanskrit', 'English'],
 perMinuteRate: 25,
 consultationTypes: [
 { name: 'Kundli Reading', rate: 800, duration: 30 },
 { name: 'Marriage Compatibility', rate: 1200, duration: 45 },
 { name: 'Career Consultation', rate: 500, duration: 20 },
 { name: 'Gemstone Recommendation', rate: 800, duration: 30 },
 { name: 'Vastu Consultation', rate: 1200, duration: 45 },
 ],
};

// ─── Component ──────────────────────────────────────────────────

export default function AstrologerProfilePage() {
 const [profile, setProfile] = useState<AstrologerProfile>(defaultProfile);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 setProfile(JSON.parse(stored));
 }
 }, []);

 function updateField<K extends keyof AstrologerProfile>(key: K, value: AstrologerProfile[K]) {
 setProfile((prev) => ({ ...prev, [key]: value }));
 setSaved(false);
 }

 function toggleSpecialty(spec: string) {
 updateField(
 'specialties',
 profile.specialties.includes(spec)
 ? profile.specialties.filter((s) => s !== spec)
 : [...profile.specialties, spec]
 );
 }

 function toggleLanguage(lang: string) {
 updateField(
 'languages',
 profile.languages.includes(lang)
 ? profile.languages.filter((l) => l !== lang)
 : [...profile.languages, lang]
 );
 }

 function updateConsultationType(index: number, field: string, value: string | number) {
 const updated = [...profile.consultationTypes];
 const existing = updated[index];
 if (existing) {
 updated[index] = { ...existing, [field]: value };
 updateField('consultationTypes', updated);
 }
 }

 function addConsultationType() {
 updateField('consultationTypes', [
 ...profile.consultationTypes,
 { name: '', rate: 500, duration: 30 },
 ]);
 }

 function removeConsultationType(index: number) {
 updateField(
 'consultationTypes',
 profile.consultationTypes.filter((_, i) => i !== index)
 );
 }

 function handleSave() {
 setSaving(true);
 setTimeout(() => {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
 setSaving(false);
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 }, 500);
 }

 return (
 <div className="space-y-6 max-w-3xl">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-surface-800">My Profile</h1>
 <p className="text-surface-500 mt-1">Manage your astrologer profile and pricing</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-medium text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
 >
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
 {saved ? 'Saved!' : 'Save Changes'}
 </button>
 </div>

 {/* Avatar */}
 <div className="bg-white rounded-xl border border-surface-100 p-6 flex items-center gap-6">
 <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
 <UserCircle className="w-12 h-12 text-purple-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-surface-800">{profile.displayName}</h2>
 <p className="text-sm text-surface-500">{profile.experienceYears} years experience</p>
 <div className="flex items-center gap-1 mt-1">
 <Star className="w-4 h-4 text-temple-gold fill-temple-gold" />
 <span className="text-sm font-medium text-surface-700">4.9</span>
 <span className="text-xs text-surface-400">(342 reviews)</span>
 </div>
 </div>
 </div>

 {/* Display Name */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4">Display Name</h3>
 <input
 type="text"
 value={profile.displayName}
 onChange={(e) => updateField('displayName', e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
 />
 </div>

 {/* Bio */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <BookOpen className="w-4 h-4 text-surface-400" /> Bio
 </h3>
 <textarea
 value={profile.bio}
 onChange={(e) => updateField('bio', e.target.value)}
 rows={4}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 resize-none"
 placeholder="Tell devotees about your background, training, and approach..."
 />
 </div>

 {/* Experience */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4">Experience</h3>
 <div className="flex items-center gap-3">
 <input
 type="number"
 value={profile.experienceYears}
 onChange={(e) => updateField('experienceYears', Math.max(0, parseInt(e.target.value) || 0))}
 min={0}
 className="w-24 px-3 py-2.5 border border-surface-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
 />
 <span className="text-sm text-surface-600">years</span>
 </div>
 </div>

 {/* Per-Minute Rate */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <IndianRupee className="w-4 h-4 text-surface-400" /> Per-Minute Rate
 </h3>
 <div className="flex items-center gap-3">
 <div className="relative">
 <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="number"
 value={profile.perMinuteRate}
 onChange={(e) => updateField('perMinuteRate', Math.max(1, parseInt(e.target.value) || 0))}
 min={1}
 className="w-32 pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
 />
 </div>
 <span className="text-sm text-surface-600">per minute (for chat/call)</span>
 </div>
 </div>

 {/* Consultation Types */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-surface-800 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-surface-400" /> Consultation Types
 </h3>
 <button
 onClick={addConsultationType}
 className="text-sm text-purple-600 font-medium hover:text-purple-700"
 >
 + Add Type
 </button>
 </div>
 <div className="space-y-3">
 {profile.consultationTypes.map((ct, idx) => (
 <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-surface-50 rounded-lg">
 <input
 type="text"
 value={ct.name}
 onChange={(e) => updateConsultationType(idx, 'name', e.target.value)}
 className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
 placeholder="Consultation name"
 />
 <div className="flex gap-2">
 <div className="relative">
 <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
 <input
 type="number"
 value={ct.rate}
 onChange={(e) => updateConsultationType(idx, 'rate', parseInt(e.target.value) || 0)}
 className="w-24 pl-8 pr-2 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
 placeholder="Rate"
 />
 </div>
 <input
 type="number"
 value={ct.duration}
 onChange={(e) => updateConsultationType(idx, 'duration', parseInt(e.target.value) || 0)}
 className="w-20 px-2 py-2 border border-surface-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-200"
 placeholder="Min"
 />
 <span className="text-xs text-surface-400 self-center">min</span>
 <button
 onClick={() => removeConsultationType(idx)}
 className="px-2 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
 >
 Remove
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Specialties */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-surface-400" /> Specialties
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_SPECIALTIES.map((spec) => {
 const selected = profile.specialties.includes(spec);
 return (
 <button
 key={spec}
 onClick={() => toggleSpecialty(spec)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected ? 'bg-purple-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {spec}
 </button>
 );
 })}
 </div>
 </div>

 {/* Languages */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Languages className="w-4 h-4 text-surface-400" /> Languages
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_LANGUAGES.map((lang) => {
 const selected = profile.languages.includes(lang);
 return (
 <button
 key={lang}
 onClick={() => toggleLanguage(lang)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected ? 'bg-blue-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {lang}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
}
