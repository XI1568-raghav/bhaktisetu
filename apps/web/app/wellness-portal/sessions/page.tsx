'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  Clock,
  Users,
  Save,
  Loader2,
  Leaf,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface WellnessSession {
  id: string;
  title: string;
  type: 'group' | 'private';
  description: string;
  schedule: string;
  duration: number;
  price: number;
  maxCapacity: number;
  enrolled: number;
  category: string;
  isActive: boolean;
}

const STORAGE_KEY = 'poojly_wellness_sessions';

const CATEGORIES = [
  'Hatha Yoga', 'Ashtanga Yoga', 'Vinyasa Flow', 'Kundalini Yoga',
  'Pranayama', 'Meditation', 'Vipassana', 'Sound Healing',
  'Ayurveda Workshop', 'Yoga Nidra', 'Chair Yoga', 'Other',
];

const defaultSessions: WellnessSession[] = [
  {
    id: '1',
    title: 'Morning Hatha Yoga',
    type: 'group',
    description: 'Traditional hatha yoga practice focusing on asanas, pranayama, and relaxation. Suitable for all levels.',
    schedule: 'Mon, Wed, Fri - 6:00 AM',
    duration: 60,
    price: 200,
    maxCapacity: 20,
    enrolled: 12,
    category: 'Hatha Yoga',
    isActive: true,
  },
  {
    id: '2',
    title: 'Pranayama & Meditation',
    type: 'group',
    description: 'Deep breathing techniques and guided meditation for stress relief and mental clarity.',
    schedule: 'Daily - 8:00 AM',
    duration: 45,
    price: 150,
    maxCapacity: 15,
    enrolled: 8,
    category: 'Pranayama',
    isActive: true,
  },
  {
    id: '3',
    title: 'Private Yoga Therapy',
    type: 'private',
    description: 'One-on-one therapeutic yoga session tailored to your health conditions and goals. Includes personalized sequence.',
    schedule: 'By appointment',
    duration: 90,
    price: 1500,
    maxCapacity: 1,
    enrolled: 1,
    category: 'Hatha Yoga',
    isActive: true,
  },
  {
    id: '4',
    title: 'Evening Meditation Circle',
    type: 'group',
    description: 'Guided meditation with mantra chanting and singing bowls. Perfect way to end your day with peace.',
    schedule: 'Tue, Thu, Sat - 6:00 PM',
    duration: 30,
    price: 100,
    maxCapacity: 25,
    enrolled: 15,
    category: 'Meditation',
    isActive: true,
  },
  {
    id: '5',
    title: 'Weekend Vipassana Retreat',
    type: 'group',
    description: 'Intensive 2-day silent meditation retreat with guided instructions, vegetarian meals, and nature walks.',
    schedule: 'First weekend of every month',
    duration: 720,
    price: 5000,
    maxCapacity: 30,
    enrolled: 22,
    category: 'Vipassana',
    isActive: true,
  },
  {
    id: '6',
    title: 'Kundalini Awakening',
    type: 'group',
    description: 'Kundalini yoga with kriyas, breath work, and meditation to awaken dormant energy.',
    schedule: 'Saturday - 7:00 AM',
    duration: 75,
    price: 300,
    maxCapacity: 15,
    enrolled: 6,
    category: 'Kundalini Yoga',
    isActive: false,
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Component ──────────────────────────────────────────────────

export default function WellnessSessionsPage() {
  const [sessions, setSessions] = useState<WellnessSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<'group' | 'private'>('group');
  const [formDesc, setFormDesc] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formCategory, setFormCategory] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSessions(JSON.parse(stored));
    } else {
      setSessions(defaultSessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSessions));
    }
  }, []);

  function persist(updated: WellnessSession[]) {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function resetForm() {
    setFormTitle('');
    setFormType('group');
    setFormDesc('');
    setFormSchedule('');
    setFormDuration('');
    setFormPrice('');
    setFormCapacity('');
    setFormCategory('');
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(session: WellnessSession) {
    setFormTitle(session.title);
    setFormType(session.type);
    setFormDesc(session.description);
    setFormSchedule(session.schedule);
    setFormDuration(String(session.duration));
    setFormPrice(String(session.price));
    setFormCapacity(String(session.maxCapacity));
    setFormCategory(session.category);
    setEditingId(session.id);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formPrice || !formCategory) return;

    setSaving(true);
    setTimeout(() => {
      if (editingId) {
        const updated = sessions.map((s) =>
          s.id === editingId
            ? {
                ...s,
                title: formTitle.trim(),
                type: formType,
                description: formDesc.trim(),
                schedule: formSchedule.trim(),
                duration: parseInt(formDuration) || 0,
                price: parseInt(formPrice) || 0,
                maxCapacity: parseInt(formCapacity) || 1,
                category: formCategory,
              }
            : s
        );
        persist(updated);
      } else {
        const newSession: WellnessSession = {
          id: generateId(),
          title: formTitle.trim(),
          type: formType,
          description: formDesc.trim(),
          schedule: formSchedule.trim(),
          duration: parseInt(formDuration) || 0,
          price: parseInt(formPrice) || 0,
          maxCapacity: parseInt(formCapacity) || 1,
          enrolled: 0,
          category: formCategory,
          isActive: true,
        };
        persist([...sessions, newSession]);
      }
      setSaving(false);
      resetForm();
    }, 400);
  }

  function deleteSession(id: string) {
    persist(sessions.filter((s) => s.id !== id));
  }

  function toggleActive(id: string) {
    persist(sessions.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Sessions</h1>
          <p className="text-surface-500 mt-1">
            {sessions.length} sessions ({sessions.filter((s) => s.isActive).length} active)
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Session
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">
              {editingId ? 'Edit Session' : 'Add New Session'}
            </h2>
            <button onClick={resetForm} className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  placeholder="e.g. Morning Hatha Yoga"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 bg-white"
                  required
                >
                  <option value="">Select</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(['group', 'private'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                        formType === t ? 'bg-emerald-600 text-white' : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Schedule</label>
                <input
                  type="text"
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  placeholder="e.g. Mon, Wed, Fri - 6:00 AM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Price (INR) *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                    placeholder="200" min="0" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration (min)</label>
                <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  placeholder="60" min="10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Max Capacity</label>
                <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  placeholder="20" min="1" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Update Session' : 'Add Session'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Leaf className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No sessions added</h3>
          <p className="text-sm text-surface-500 mt-1">Add your first session to start teaching.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                session.isActive ? 'border-surface-100 hover:border-emerald-200' : 'border-surface-100 opacity-60'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-surface-800">{session.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      session.type === 'private' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>{session.type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      session.isActive ? 'bg-tulsi-green-light/30 text-tulsi-green' : 'bg-surface-100 text-surface-500'
                    }`}>{session.isActive ? 'Active' : 'Inactive'}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">{session.category}</span>
                  </div>
                  {session.description && <p className="text-sm text-surface-500 mt-1 line-clamp-2">{session.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-surface-500">
                    <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{session.schedule}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{session.duration} min</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{session.enrolled}/{session.maxCapacity}</span>
                    <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{formatCurrency(session.price)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(session.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      session.isActive ? 'bg-surface-100 text-surface-600 hover:bg-surface-200' : 'bg-tulsi-green text-white hover:opacity-90'
                    }`}>{session.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => openEditForm(session)}
                    className="p-2 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteSession(session.id)}
                    className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
