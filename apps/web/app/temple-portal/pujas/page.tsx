'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import {
 Flame,
 Plus,
 Pencil,
 Trash2,
 X,
 IndianRupee,
 Clock,
 Save,
 Loader2,
 Users,
 UserCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface TemplePuja {
 id: string;
 name: string;
 description: string;
 price: number;
 nriPrice: number;
 duration: number;
 deity: string;
 assignedPriest: string;
 isActive: boolean;
 bookingsCount: number;
}

const STORAGE_KEY = 'poojly_temple_pujas';

const DEITIES = [
 'Lord Shiva', 'Lord Vishnu', 'Lord Ganesha', 'Lord Hanuman',
 'Goddess Durga', 'Goddess Lakshmi', 'Goddess Saraswati',
 'Lord Krishna', 'Lord Rama', 'Navagraha', 'Multiple Deities',
];

const PRIESTS = [
 'Pandit Ramesh Sharma', 'Pandit Suresh Mishra', 'Pandit Deepak Tiwari',
 'Pandit Arun Joshi', 'Pandit Manoj Dubey', 'Pandit Vinod Pandey',
 'Pandit Rahul Shukla', 'Pandit Govind Upadhyay',
];

const defaultPujas: TemplePuja[] = [
 {
 id: '1', name: 'Rudrabhishek Puja', description: 'Sacred abhishekam with Rudra Chamakam and Namakam chanting.',
 price: 1151, nriPrice: 9999, duration: 120, deity: 'Lord Shiva', assignedPriest: 'Pandit Ramesh Sharma', isActive: true, bookingsCount: 156,
 },
 {
 id: '2', name: 'Maha Mrityunjay Jaap', description: '1,08,000 mantras for health and longevity protection.',
 price: 702, nriPrice: 6999, duration: 90, deity: 'Lord Shiva', assignedPriest: 'Pandit Suresh Mishra', isActive: true, bookingsCount: 89,
 },
 {
 id: '3', name: 'Satyanarayan Katha', description: 'Complete Satyanarayan Vrat Katha with all five chapters.',
 price: 1701, nriPrice: 14999, duration: 150, deity: 'Lord Vishnu', assignedPriest: 'Pandit Deepak Tiwari', isActive: true, bookingsCount: 234,
 },
 {
 id: '4', name: 'Ganesh Atharvashirsha Path', description: 'Recitation for obstacle removal and new venture success.',
 price: 501, nriPrice: 4999, duration: 60, deity: 'Lord Ganesha', assignedPriest: 'Pandit Arun Joshi', isActive: true, bookingsCount: 67,
 },
 {
 id: '5', name: 'Navgraha Shanti Puja', description: 'Pacification of all nine planets with individual mantras and havan.',
 price: 2101, nriPrice: 19999, duration: 180, deity: 'Navagraha', assignedPriest: 'Pandit Manoj Dubey', isActive: true, bookingsCount: 45,
 },
 {
 id: '6', name: 'Lakshmi Puja', description: 'Invocation of Goddess Lakshmi for wealth and prosperity.',
 price: 801, nriPrice: 7999, duration: 75, deity: 'Goddess Lakshmi', assignedPriest: 'Pandit Vinod Pandey', isActive: false, bookingsCount: 112,
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

export default function TemplePujasPage() {
 const [pujas, setPujas] = useState<TemplePuja[]>([]);
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 const [formName, setFormName] = useState('');
 const [formDesc, setFormDesc] = useState('');
 const [formPrice, setFormPrice] = useState('');
 const [formNriPrice, setFormNriPrice] = useState('');
 const [formDuration, setFormDuration] = useState('');
 const [formDeity, setFormDeity] = useState('');
 const [formPriest, setFormPriest] = useState('');

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 setPujas(JSON.parse(stored));
 } else {
 setPujas(defaultPujas);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPujas));
 }
 }, []);

 function persist(updated: TemplePuja[]) {
 setPujas(updated);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 }

 function resetForm() {
 setFormName(''); setFormDesc(''); setFormPrice(''); setFormNriPrice('');
 setFormDuration(''); setFormDeity(''); setFormPriest('');
 setEditingId(null); setShowForm(false);
 }

 function openEditForm(puja: TemplePuja) {
 setFormName(puja.name); setFormDesc(puja.description);
 setFormPrice(String(puja.price)); setFormNriPrice(String(puja.nriPrice));
 setFormDuration(String(puja.duration)); setFormDeity(puja.deity);
 setFormPriest(puja.assignedPriest); setEditingId(puja.id); setShowForm(true);
 }

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!formName.trim() || !formPrice || !formDeity) return;
 setSaving(true);
 setTimeout(() => {
 if (editingId) {
 persist(pujas.map((p) => p.id === editingId ? {
 ...p, name: formName.trim(), description: formDesc.trim(),
 price: parseInt(formPrice) || 0, nriPrice: parseInt(formNriPrice) || 0,
 duration: parseInt(formDuration) || 0, deity: formDeity, assignedPriest: formPriest,
 } : p));
 } else {
 persist([...pujas, {
 id: generateId(), name: formName.trim(), description: formDesc.trim(),
 price: parseInt(formPrice) || 0, nriPrice: parseInt(formNriPrice) || 0,
 duration: parseInt(formDuration) || 0, deity: formDeity,
 assignedPriest: formPriest, isActive: true, bookingsCount: 0,
 }]);
 }
 setSaving(false); resetForm();
 }, 400);
 }

 function toggleActive(id: string) {
 persist(pujas.map((p) => p.id === id ? { ...p, isActive: !p.isActive } : p));
 }

 function deletePuja(id: string) {
 persist(pujas.filter((p) => p.id !== id));
 }

 return (
 <div className="space-y-6 max-w-5xl">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-surface-800">Pujas Offered</h1>
 <p className="text-surface-500 mt-1">
 {pujas.length} pujas ({pujas.filter((p) => p.isActive).length} active)
 </p>
 </div>
 <button onClick={() => { resetForm(); setShowForm(true); }}
 className="inline-flex items-center gap-2 px-4 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors">
 <Plus className="w-4 h-4" /> Add Puja
 </button>
 </div>

 {/* Form */}
 {showForm && (
 <div className="bg-white rounded-xl border border-saffron-200 p-6">
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-lg font-semibold text-surface-800">
 {editingId ? 'Edit Puja' : 'Add New Puja'}
 </h2>
 <button onClick={resetForm} className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100">
 <X className="w-5 h-5" />
 </button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Puja Name *</label>
 <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 required />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Deity *</label>
 <select value={formDeity} onChange={(e) => setFormDeity(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 bg-white"
 required>
 <option value="">Select</option>
 {DEITIES.map((d) => <option key={d} value={d}>{d}</option>)}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
 <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 resize-none" />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Price (INR) *</label>
 <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
 min="1" required />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">NRI Price (INR)</label>
 <input type="number" value={formNriPrice} onChange={(e) => setFormNriPrice(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
 min="1" />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration (min)</label>
 <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
 min="10" />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">Assigned Priest</label>
 <select value={formPriest} onChange={(e) => setFormPriest(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 bg-white">
 <option value="">Unassigned</option>
 {PRIESTS.map((p) => <option key={p} value={p}>{p}</option>)}
 </select>
 </div>
 </div>
 <div className="flex items-center gap-3 pt-2">
 <button type="submit" disabled={saving}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50">
 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 {editingId ? 'Update' : 'Add Puja'}
 </button>
 <button type="button" onClick={resetForm}
 className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors">
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Pujas List */}
 {pujas.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <Flame className="w-12 h-12 text-surface-300 mb-4" />
 <h3 className="text-lg font-semibold text-surface-700">No pujas added</h3>
 </div>
 ) : (
 <div className="space-y-3">
 {pujas.map((puja) => (
 <div key={puja.id}
 className={`bg-white rounded-xl border p-5 transition-all ${
 puja.isActive ? 'border-surface-100 hover:border-saffron-200' : 'border-surface-100 opacity-60'
 }`}>
 <div className="flex flex-col sm:flex-row sm:items-start gap-4">
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <Flame className="w-5 h-5 text-saffron-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="text-base font-semibold text-surface-800">{puja.name}</h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
 puja.isActive ? 'bg-tulsi-green-light/30 text-tulsi-green' : 'bg-surface-100 text-surface-500'
 }`}>{puja.isActive ? 'Active' : 'Inactive'}</span>
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">{puja.deity}</span>
 </div>
 {puja.description && <p className="text-sm text-surface-500 mt-1">{puja.description}</p>}
 <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-surface-500">
 <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{formatCurrency(puja.price)}</span>
 <span className="text-xs text-surface-400">NRI: {formatCurrency(puja.nriPrice)}</span>
 <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{puja.duration} min</span>
 <span className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" />{puja.assignedPriest || 'Unassigned'}</span>
 <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{puja.bookingsCount} bookings</span>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button onClick={() => toggleActive(puja.id)}
 className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
 puja.isActive ? 'bg-surface-100 text-surface-600 hover:bg-surface-200' : 'bg-tulsi-green text-white hover:opacity-90'
 }`}>{puja.isActive ? 'Deactivate' : 'Activate'}</button>
 <button onClick={() => openEditForm(puja)}
 className="p-2 text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors">
 <Pencil className="w-4 h-4" />
 </button>
 <button onClick={() => deletePuja(puja.id)}
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
