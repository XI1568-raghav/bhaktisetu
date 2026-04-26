'use client';

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
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface PujaService {
 id: string;
 name: string;
 description: string;
 price: number;
 duration: number; // minutes
 deity: string;
 isActive: boolean;
}

const STORAGE_KEY = 'poojly_priest_services';

const DEITIES = [
 'Lord Shiva', 'Lord Vishnu', 'Lord Ganesha', 'Lord Hanuman',
 'Goddess Durga', 'Goddess Lakshmi', 'Goddess Saraswati',
 'Lord Krishna', 'Lord Rama', 'Navagraha', 'Surya Dev', 'Other',
];

const defaultServices: PujaService[] = [
 {
 id: '1',
 name: 'Rudrabhishek Puja',
 description: 'Sacred abhishekam of Lord Shiva with milk, curd, honey, ghee, and holy water. Chanting of Rudra Chamakam and Namakam.',
 price: 1151,
 duration: 120,
 deity: 'Lord Shiva',
 isActive: true,
 },
 {
 id: '2',
 name: 'Maha Mrityunjay Jaap',
 description: 'Chanting of 1,08,000 Maha Mrityunjay mantras for health, longevity, and protection from untimely death.',
 price: 702,
 duration: 90,
 deity: 'Lord Shiva',
 isActive: true,
 },
 {
 id: '3',
 name: 'Satyanarayan Katha',
 description: 'Complete Satyanarayan Vrat Katha with all five chapters, followed by aarti and prasad distribution.',
 price: 1701,
 duration: 150,
 deity: 'Lord Vishnu',
 isActive: true,
 },
 {
 id: '4',
 name: 'Ganesh Atharvashirsha Path',
 description: 'Recitation of Ganesh Atharvashirsha for removing obstacles and bringing success in new ventures.',
 price: 501,
 duration: 60,
 deity: 'Lord Ganesha',
 isActive: true,
 },
 {
 id: '5',
 name: 'Navgraha Shanti Puja',
 description: 'Pacification of all nine planets through individual mantras, havan, and specific offerings for each graha.',
 price: 2101,
 duration: 180,
 deity: 'Navagraha',
 isActive: false,
 },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

function generateId(): string {
 return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestServicesPage() {
 const [services, setServices] = useState<PujaService[]>([]);
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);

 // Form state
 const [formName, setFormName] = useState('');
 const [formDesc, setFormDesc] = useState('');
 const [formPrice, setFormPrice] = useState('');
 const [formDuration, setFormDuration] = useState('');
 const [formDeity, setFormDeity] = useState('');

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 setServices(JSON.parse(stored));
 } else {
 setServices(defaultServices);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultServices));
 }
 }, []);

 function persist(updated: PujaService[]) {
 setServices(updated);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 }

 function resetForm() {
 setFormName('');
 setFormDesc('');
 setFormPrice('');
 setFormDuration('');
 setFormDeity('');
 setEditingId(null);
 setShowForm(false);
 }

 function openAddForm() {
 resetForm();
 setShowForm(true);
 }

 function openEditForm(service: PujaService) {
 setFormName(service.name);
 setFormDesc(service.description);
 setFormPrice(String(service.price));
 setFormDuration(String(service.duration));
 setFormDeity(service.deity);
 setEditingId(service.id);
 setShowForm(true);
 }

 function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!formName.trim() || !formPrice || !formDuration || !formDeity) return;

 setSaving(true);
 setTimeout(() => {
 if (editingId) {
 const updated = services.map((s) =>
 s.id === editingId
 ? {
 ...s,
 name: formName.trim(),
 description: formDesc.trim(),
 price: parseInt(formPrice) || 0,
 duration: parseInt(formDuration) || 0,
 deity: formDeity,
 }
 : s
 );
 persist(updated);
 } else {
 const newService: PujaService = {
 id: generateId(),
 name: formName.trim(),
 description: formDesc.trim(),
 price: parseInt(formPrice) || 0,
 duration: parseInt(formDuration) || 0,
 deity: formDeity,
 isActive: true,
 };
 persist([...services, newService]);
 }
 setSaving(false);
 resetForm();
 }, 400);
 }

 function toggleActive(id: string) {
 const updated = services.map((s) =>
 s.id === id ? { ...s, isActive: !s.isActive } : s
 );
 persist(updated);
 }

 function deleteService(id: string) {
 const updated = services.filter((s) => s.id !== id);
 persist(updated);
 }

 const activeCount = services.filter((s) => s.isActive).length;

 return (
 <div className="space-y-6 max-w-5xl">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-surface-800">My Puja Services</h1>
 <p className="text-surface-500 mt-1">
 {services.length} services ({activeCount} active)
 </p>
 </div>
 <button
 onClick={openAddForm}
 className="inline-flex items-center gap-2 px-4 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors"
 >
 <Plus className="w-4 h-4" />
 Add Puja
 </button>
 </div>

 {/* Add/Edit Form */}
 {showForm && (
 <div className="bg-white rounded-xl border border-saffron-200 p-6">
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-lg font-semibold text-surface-800">
 {editingId ? 'Edit Puja Service' : 'Add New Puja Service'}
 </h2>
 <button
 onClick={resetForm}
 className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Puja Name *
 </label>
 <input
 type="text"
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 placeholder="e.g. Rudrabhishek Puja"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Deity *
 </label>
 <select
 value={formDeity}
 onChange={(e) => setFormDeity(e.target.value)}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 bg-white"
 required
 >
 <option value="">Select deity</option>
 {DEITIES.map((d) => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Description
 </label>
 <textarea
 value={formDesc}
 onChange={(e) => setFormDesc(e.target.value)}
 rows={3}
 className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 resize-none"
 placeholder="Describe the puja, rituals involved, and benefits..."
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Price (INR) *
 </label>
 <div className="relative">
 <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="number"
 value={formPrice}
 onChange={(e) => setFormPrice(e.target.value)}
 className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 placeholder="1151"
 min="1"
 required
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-surface-700 mb-1.5">
 Duration (minutes) *
 </label>
 <div className="relative">
 <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="number"
 value={formDuration}
 onChange={(e) => setFormDuration(e.target.value)}
 className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
 placeholder="120"
 min="10"
 required
 />
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 pt-2">
 <button
 type="submit"
 disabled={saving}
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50"
 >
 {saving ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Save className="w-4 h-4" />
 )}
 {editingId ? 'Update Service' : 'Add Service'}
 </button>
 <button
 type="button"
 onClick={resetForm}
 className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Services List */}
 {services.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <Flame className="w-12 h-12 text-surface-300 mb-4" />
 <h3 className="text-lg font-semibold text-surface-700">No services added yet</h3>
 <p className="text-sm text-surface-500 mt-1">Add your first puja service to start receiving bookings.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {services.map((service) => (
 <div
 key={service.id}
 className={`bg-white rounded-xl border p-5 transition-all ${
 service.isActive
 ? 'border-surface-100 hover:border-saffron-200'
 : 'border-surface-100 opacity-60'
 }`}
 >
 <div className="flex flex-col sm:flex-row sm:items-start gap-4">
 <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
 <Flame className="w-5 h-5 text-saffron-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="text-base font-semibold text-surface-800">{service.name}</h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
 service.isActive
 ? 'bg-tulsi-green-light/30 text-tulsi-green'
 : 'bg-surface-100 text-surface-500'
 }`}>
 {service.isActive ? 'Active' : 'Inactive'}
 </span>
 <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
 {service.deity}
 </span>
 </div>
 {service.description && (
 <p className="text-sm text-surface-500 mt-1 line-clamp-2">{service.description}</p>
 )}
 <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
 <span className="flex items-center gap-1">
 <IndianRupee className="w-3.5 h-3.5" />
 {formatCurrency(service.price)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5" />
 {service.duration} min
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => toggleActive(service.id)}
 className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
 service.isActive
 ? 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 : 'bg-tulsi-green text-white hover:opacity-90'
 }`}
 >
 {service.isActive ? 'Deactivate' : 'Activate'}
 </button>
 <button
 onClick={() => openEditForm(service)}
 className="p-2 text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
 >
 <Pencil className="w-4 h-4" />
 </button>
 <button
 onClick={() => deleteService(service.id)}
 className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 >
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
