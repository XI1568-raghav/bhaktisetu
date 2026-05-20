'use client';

import { useState, useEffect, useCallback } from 'react';
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
 AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import {
 listMyOfferings,
 createOffering,
 updateOffering,
 deleteOffering,
 toggleOfferingActive,
 type Offering,
} from '../../../lib/pandit-api';

// ─── Constants ──────────────────────────────────────────────────

const DEITIES = [
 'Lord Shiva', 'Lord Vishnu', 'Lord Ganesha', 'Lord Hanuman',
 'Goddess Durga', 'Goddess Lakshmi', 'Goddess Saraswati',
 'Lord Krishna', 'Lord Rama', 'Navagraha', 'Surya Dev', 'Other',
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
 style: 'currency',
 currency: 'INR',
 maximumFractionDigits: 0,
 }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────

export default function PriestServicesPage() {
 return (
  <AuthGuard allowedRoles={['priest', 'admin']}>
   <PriestServicesPageContent />
  </AuthGuard>
 );
}

function PriestServicesPageContent() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [offerings, setOfferings] = useState<Offering[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);
 const [busyId, setBusyId] = useState<string | null>(null);

 // Form state
 const [formName, setFormName] = useState('');
 const [formDesc, setFormDesc] = useState('');
 const [formPrice, setFormPrice] = useState('');
 const [formDuration, setFormDuration] = useState('');
 const [formDeity, setFormDeity] = useState('');

 const loadOfferings = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  setError(null);
  try {
   const data = await listMyOfferings(token);
   setOfferings(data);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to load pujas');
  } finally {
   setLoading(false);
  }
 }, [token]);

 useEffect(() => {
  if (!token) return;
  void loadOfferings();
 }, [token, loadOfferings]);

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

 function openEditForm(offering: Offering) {
  setFormName(offering.name);
  setFormDesc(offering.description ?? '');
  setFormPrice(String(parseFloat(offering.basePrice)));
  setFormDuration(String(offering.durationMinutes));
  setFormDeity(offering.deity);
  setEditingId(offering.id);
  setShowForm(true);
 }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!formName.trim() || !formPrice || !formDuration || !formDeity) return;

  const payload = {
   name: formName.trim(),
   description: formDesc.trim() || undefined,
   deity: formDeity,
   basePrice: parseFloat(formPrice) || 0,
   durationMinutes: parseInt(formDuration, 10) || 0,
  };

  setSaving(true);
  setError(null);
  try {
   if (editingId) {
    const updated = await updateOffering(token, editingId, payload);
    setOfferings((prev) => prev.map((o) => (o.id === editingId ? updated : o)));
   } else {
    const created = await createOffering(token, payload);
    setOfferings((prev) => [...prev, created]);
   }
   resetForm();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to save puja');
  } finally {
   setSaving(false);
  }
 }

 async function handleToggleActive(id: string) {
  setBusyId(id);
  setError(null);
  // Optimistic: flip the flag, revert on failure.
  const prev = offerings;
  setOfferings((o) =>
   o.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
  );
  try {
   const updated = await toggleOfferingActive(token, id);
   setOfferings((o) => o.map((s) => (s.id === id ? updated : s)));
  } catch (err) {
   setOfferings(prev);
   setError(err instanceof Error ? err.message : 'Toggle failed');
  } finally {
   setBusyId(null);
  }
 }

 async function handleDelete(id: string) {
  // eslint-disable-next-line no-alert
  if (!confirm('Delete this puja service? This cannot be undone.')) return;
  setBusyId(id);
  setError(null);
  const prev = offerings;
  setOfferings((o) => o.filter((s) => s.id !== id));
  try {
   await deleteOffering(token, id);
  } catch (err) {
   setOfferings(prev);
   setError(err instanceof Error ? err.message : 'Delete failed');
  } finally {
   setBusyId(null);
  }
 }

 const activeCount = offerings.filter((s) => s.isActive).length;

 return (
  <div className="space-y-6 max-w-5xl">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-2xl font-bold text-surface-800">My Puja Services</h1>
     <p className="text-surface-500 mt-1">
      {offerings.length} services ({activeCount} active)
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

   {/* Error banner */}
   {error && (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
     <div className="flex-1">{error}</div>
     <button
      onClick={() => void loadOfferings()}
      className="ml-2 text-xs font-medium text-red-700 underline hover:no-underline"
     >
      Retry
     </button>
    </div>
   )}

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
         minLength={2}
         maxLength={200}
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
        maxLength={5000}
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
          min="0"
          step="1"
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
          min="5"
          max="600"
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
   {loading ? (
    <div className="space-y-3">
     {[1, 2, 3].map((i) => (
      <div
       key={i}
       className="bg-white rounded-xl border border-surface-100 p-5 animate-pulse"
      >
       <div className="flex gap-4">
        <div className="w-12 h-12 bg-surface-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
         <div className="h-4 bg-surface-100 rounded w-2/3" />
         <div className="h-3 bg-surface-100 rounded w-full" />
         <div className="h-3 bg-surface-100 rounded w-1/2" />
        </div>
       </div>
      </div>
     ))}
    </div>
   ) : offerings.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
     <Flame className="w-12 h-12 text-surface-300 mb-4" />
     <h3 className="text-lg font-semibold text-surface-700">No services added yet</h3>
     <p className="text-sm text-surface-500 mt-1">Add your first puja service to start receiving bookings.</p>
    </div>
   ) : (
    <div className="space-y-3">
     {offerings.map((offering) => {
      const price = parseFloat(offering.basePrice);
      const disabled = busyId === offering.id;
      return (
      <div
       key={offering.id}
       className={`bg-white rounded-xl border p-5 transition-all ${
        offering.isActive
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
          <h3 className="text-base font-semibold text-surface-800">{offering.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
           offering.isActive
            ? 'bg-tulsi-green-light/30 text-tulsi-green'
            : 'bg-surface-100 text-surface-500'
          }`}>
           {offering.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
           {offering.deity}
          </span>
         </div>
         {offering.description && (
          <p className="text-sm text-surface-500 mt-1 line-clamp-2">{offering.description}</p>
         )}
         <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
          <span className="flex items-center gap-1">
           <IndianRupee className="w-3.5 h-3.5" />
           {formatCurrency(price)}
          </span>
          <span className="flex items-center gap-1">
           <Clock className="w-3.5 h-3.5" />
           {offering.durationMinutes} min
          </span>
         </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
         <button
          onClick={() => void handleToggleActive(offering.id)}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
           offering.isActive
            ? 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            : 'bg-tulsi-green text-white hover:opacity-90'
          }`}
         >
          {offering.isActive ? 'Deactivate' : 'Activate'}
         </button>
         <button
          onClick={() => openEditForm(offering)}
          disabled={disabled}
          className="p-2 text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors disabled:opacity-50"
         >
          <Pencil className="w-4 h-4" />
         </button>
         <button
          onClick={() => void handleDelete(offering.id)}
          disabled={disabled}
          className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
         >
          <Trash2 className="w-4 h-4" />
         </button>
        </div>
       </div>
      </div>
      );
     })}
    </div>
   )}
  </div>
 );
}
