'use client';

import { useState, useEffect } from 'react';
import {
 UserCircle,
 Star,
 Save,
 Loader2,
 CheckCircle2,
 BookOpen,
 Award,
 Languages,
 Leaf,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface WellnessProfile {
 displayName: string;
 bio: string;
 experienceYears: number;
 certifications: string[];
 specialties: string[];
 languages: string[];
}

const STORAGE_KEY = 'poojly_wellness_profile';

const ALL_CERTIFICATIONS = [
 'RYT-200 (Yoga Alliance)', 'RYT-500 (Yoga Alliance)', 'E-RYT 200',
 'YACEP (Yoga Alliance)', 'Ayurveda Practitioner', 'Vipassana Teacher',
 'Mindfulness-Based Stress Reduction (MBSR)', 'Pranic Healing Certified',
 'Reiki Master', 'Sound Healing Certified', 'Naturopathy Diploma',
];

const ALL_SPECIALTIES = [
 'Hatha Yoga', 'Ashtanga Yoga', 'Vinyasa Flow', 'Kundalini Yoga',
 'Yin Yoga', 'Pranayama', 'Meditation', 'Vipassana', 'Yoga Nidra',
 'Sound Healing', 'Ayurveda', 'Yoga Therapy', 'Chair Yoga',
 'Pre-natal Yoga', 'Kids Yoga',
];

const ALL_LANGUAGES = [
 'Hindi', 'English', 'Sanskrit', 'Tamil', 'Telugu', 'Kannada',
 'Bengali', 'Gujarati', 'Marathi', 'Malayalam',
];

const defaultProfile: WellnessProfile = {
 displayName: 'Guru Ananda Sharma',
 bio: 'Dedicated yoga practitioner and teacher for over 20 years. Trained in Rishikesh at the Sivananda Yoga Vedanta Centre. I believe yoga is not just exercise but a path to spiritual awakening. My classes blend traditional asanas with pranayama and meditation for a holistic experience.',
 experienceYears: 20,
 certifications: ['RYT-500 (Yoga Alliance)', 'E-RYT 200', 'Vipassana Teacher', 'Ayurveda Practitioner'],
 specialties: ['Hatha Yoga', 'Pranayama', 'Meditation', 'Vipassana', 'Yoga Nidra', 'Yoga Therapy'],
 languages: ['Hindi', 'English', 'Sanskrit'],
};

// ─── Component ──────────────────────────────────────────────────

export default function WellnessProfilePage() {
 const [profile, setProfile] = useState<WellnessProfile>(defaultProfile);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) setProfile(JSON.parse(stored));
 }, []);

 function updateField<K extends keyof WellnessProfile>(key: K, value: WellnessProfile[K]) {
 setProfile((prev) => ({ ...prev, [key]: value }));
 setSaved(false);
 }

 function toggleItem(key: 'certifications' | 'specialties' | 'languages', item: string) {
 const current = profile[key];
 updateField(key, current.includes(item) ? current.filter((i) => i !== item) : [...current, item]);
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
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-surface-800">My Profile</h1>
 <p className="text-surface-500 mt-1">Manage your wellness instructor profile</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
 >
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
 {saved ? 'Saved!' : 'Save Changes'}
 </button>
 </div>

 {/* Avatar */}
 <div className="bg-white rounded-xl border border-surface-100 p-6 flex items-center gap-6">
 <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
 <UserCircle className="w-12 h-12 text-emerald-400" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-surface-800">{profile.displayName}</h2>
 <p className="text-sm text-surface-500">{profile.experienceYears} years experience</p>
 <div className="flex items-center gap-1 mt-1">
 <Star className="w-4 h-4 text-temple-gold fill-temple-gold" />
 <span className="text-sm font-medium text-surface-700">4.8</span>
 <span className="text-xs text-surface-400">(218 reviews)</span>
 </div>
 </div>
 </div>

 {/* Name */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4">Display Name</h3>
 <input
 type="text"
 value={profile.displayName}
 onChange={(e) => updateField('displayName', e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
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
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none"
 placeholder="Tell students about your background and teaching philosophy..."
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
 className="w-24 px-3 py-2.5 border border-surface-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-200"
 />
 <span className="text-sm text-surface-600">years</span>
 </div>
 </div>

 {/* Certifications */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Award className="w-4 h-4 text-surface-400" /> Certifications
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_CERTIFICATIONS.map((cert) => {
 const selected = profile.certifications.includes(cert);
 return (
 <button
 key={cert}
 onClick={() => toggleItem('certifications', cert)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected ? 'bg-emerald-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {cert}
 </button>
 );
 })}
 </div>
 </div>

 {/* Specialties */}
 <div className="bg-white rounded-xl border border-surface-100 p-5">
 <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
 <Leaf className="w-4 h-4 text-surface-400" /> Specialties
 </h3>
 <div className="flex flex-wrap gap-2">
 {ALL_SPECIALTIES.map((spec) => {
 const selected = profile.specialties.includes(spec);
 return (
 <button
 key={spec}
 onClick={() => toggleItem('specialties', spec)}
 className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 selected ? 'bg-saffron-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
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
 onClick={() => toggleItem('languages', lang)}
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
