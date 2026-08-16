'use client';

import { useState, useEffect, useCallback } from 'react';
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
 AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import {
 listMySessions,
 createWellnessSession,
 updateWellnessSession,
 deleteWellnessSession,
 setWellnessSessionRoom,
 type WellnessSession,
 type WellnessSessionType,
 type WellnessSessionStatus,
} from '../../../lib/wellness-api';
import { DateTimeInput } from '../../../components/ui/DateInput';
import { H1 } from '../../../components/ui/heading-recipe';

// ─── Constants ──────────────────────────────────────────────────

const TYPES: { key: WellnessSessionType; label: string }[] = [
 { key: 'YOGA', label: 'Yoga' },
 { key: 'MEDITATION', label: 'Meditation' },
 { key: 'VIPASSANA', label: 'Vipassana' },
 { key: 'PRANAYAMA', label: 'Pranayama' },
 { key: 'OTHER', label: 'Other' },
];

const STATUSES: { key: WellnessSessionStatus; label: string }[] = [
 { key: 'SCHEDULED', label: 'Scheduled' },
 { key: 'LIVE', label: 'Live' },
 { key: 'COMPLETED', label: 'Completed' },
 { key: 'CANCELLED', label: 'Cancelled' },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
 }).format(amount);
}

function formatDateTime(iso: string): string {
 try {
  return new Date(iso).toLocaleString('en-IN', {
   day: 'numeric',
   month: 'short',
   year: 'numeric',
   hour: '2-digit',
   minute: '2-digit',
  });
 } catch {
  return iso;
 }
}

// <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm" in local time,
// whereas the API returns ISO 8601 in UTC. Convert without dragging in
// date-fns just to handle the offset.
function toLocalInput(iso: string | undefined): string {
 if (!iso) return '';
 const d = new Date(iso);
 if (isNaN(d.getTime())) return '';
 const pad = (n: number) => String(n).padStart(2, '0');
 return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function WellnessSessionsPage() {
 return (
  <AuthGuard allowedRoles={['wellness_instructor', 'admin']}>
   <WellnessSessionsPageContent />
  </AuthGuard>
 );
}

function WellnessSessionsPageContent() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [sessions, setSessions] = useState<WellnessSession[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [saving, setSaving] = useState(false);
 const [busyId, setBusyId] = useState<string | null>(null);

 // Form state
 const [formTitle, setFormTitle] = useState('');
 const [formType, setFormType] = useState<WellnessSessionType>('YOGA');
 const [formDesc, setFormDesc] = useState('');
 const [formScheduledAt, setFormScheduledAt] = useState('');
 const [formDuration, setFormDuration] = useState('');
 const [formPrice, setFormPrice] = useState('');
 const [formCapacity, setFormCapacity] = useState('');
 const [formStatus, setFormStatus] = useState<WellnessSessionStatus>('SCHEDULED');

 // Room-URL editor state (revamp: the /sessions/:id/room endpoint existed but
 // there was NO UI to set the Jitsi room — the live class was undeliverable).
 const [roomEditId, setRoomEditId] = useState<string | null>(null);
 const [roomUrlInput, setRoomUrlInput] = useState('');
 const [roomSaving, setRoomSaving] = useState(false);

 const load = useCallback(async () => {
  if (!token) return;
  setLoading(true);
  setError(null);
  try {
   const data = await listMySessions(token);
   setSessions(data);
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Failed to load sessions');
  } finally {
   setLoading(false);
  }
 }, [token]);

 useEffect(() => {
  if (!token) return;
  void load();
 }, [token, load]);

 function resetForm() {
  setFormTitle('');
  setFormType('YOGA');
  setFormDesc('');
  setFormScheduledAt('');
  setFormDuration('');
  setFormPrice('');
  setFormCapacity('');
  setFormStatus('SCHEDULED');
  setEditingId(null);
  setShowForm(false);
 }

 function openEditForm(s: WellnessSession) {
  setFormTitle(s.title);
  setFormType(s.type);
  setFormDesc(s.description);
  setFormScheduledAt(toLocalInput(s.scheduledAt));
  setFormDuration(String(s.durationMinutes));
  setFormPrice(String(Number(s.priceInr)));
  setFormCapacity(String(s.capacity));
  setFormStatus(s.status);
  setEditingId(s.id);
  setShowForm(true);
 }

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!token) return;
  if (!formTitle.trim() || !formDesc.trim() || !formScheduledAt || !formDuration || !formCapacity) {
   return;
  }

  const scheduledIso = new Date(formScheduledAt).toISOString();
  setSaving(true);
  setError(null);
  try {
   if (editingId) {
    const updated = await updateWellnessSession(token, editingId, {
     title: formTitle.trim(),
     description: formDesc.trim(),
     type: formType,
     scheduledAt: scheduledIso,
     durationMinutes: parseInt(formDuration, 10) || 0,
     capacity: parseInt(formCapacity, 10) || 1,
     priceInr: parseFloat(formPrice) || 0,
     status: formStatus,
    });
    setSessions((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
   } else {
    const created = await createWellnessSession(token, {
     title: formTitle.trim(),
     description: formDesc.trim(),
     type: formType,
     scheduledAt: scheduledIso,
     durationMinutes: parseInt(formDuration, 10) || 0,
     capacity: parseInt(formCapacity, 10) || 1,
     priceInr: parseFloat(formPrice) || 0,
    });
    setSessions((prev) => [created, ...prev]);
   }
   resetForm();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Save failed');
  } finally {
   setSaving(false);
  }
 }

 async function handleDelete(id: string) {
  if (!token) return;
  // eslint-disable-next-line no-alert
  if (!confirm('Delete this session? This cannot be undone and will remove any enrollments.')) return;
  setBusyId(id);
  setError(null);
  const prev = sessions;
  setSessions((s) => s.filter((x) => x.id !== id));
  try {
   await deleteWellnessSession(token, id);
  } catch (err) {
   setSessions(prev);
   setError(err instanceof Error ? err.message : 'Delete failed');
  } finally {
   setBusyId(null);
  }
 }

 async function handleToggleStatus(s: WellnessSession) {
  if (!token) return;
  // Cycle: SCHEDULED → CANCELLED → SCHEDULED. Others are read-only verbs.
  const next: WellnessSessionStatus = s.status === 'CANCELLED' ? 'SCHEDULED' : 'CANCELLED';
  setBusyId(s.id);
  setError(null);
  const prev = sessions;
  setSessions((arr) => arr.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
  try {
   const updated = await updateWellnessSession(token, s.id, { status: next });
   setSessions((arr) => arr.map((x) => (x.id === s.id ? updated : x)));
  } catch (err) {
   setSessions(prev);
   setError(err instanceof Error ? err.message : 'Status update failed');
  } finally {
   setBusyId(null);
  }
 }

 // Save the live-class room URL (Jitsi). Generates a sane default if blank.
 async function handleSaveRoom(s: WellnessSession) {
  if (!token) return;
  setRoomSaving(true);
  setError(null);
  try {
   const url =
    roomUrlInput.trim() ||
    `https://meet.jit.si/darshya-wellness-${s.id.slice(0, 12)}`;
   const updated = await setWellnessSessionRoom(token, s.id, url);
   setSessions((arr) => arr.map((x) => (x.id === s.id ? updated : x)));
   setRoomEditId(null);
   setRoomUrlInput('');
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Could not save room URL');
  } finally {
   setRoomSaving(false);
  }
 }

 const activeCount = sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'LIVE').length;

 return (
  <div className="space-y-6 max-w-5xl">
   <div className="flex items-center justify-between">
    <div>
     <h1 className={H1.portal}>Sessions</h1>
     <p className="text-surface-500 mt-1">
      {sessions.length} sessions ({activeCount} active)
     </p>
    </div>
    <button
     onClick={() => { resetForm(); setShowForm(true); }}
     className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white font-medium text-sm rounded-lg hover:bg-emerald-800 transition-colors"
    >
     <Plus className="w-4 h-4" />
     Add Session
    </button>
   </div>

   {error && (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
     <div className="flex-1">{error}</div>
     <button
      onClick={() => void load()}
      className="ml-2 text-xs font-medium text-red-700 underline hover:no-underline"
     >
      Retry
     </button>
    </div>
   )}

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
         minLength={3}
         maxLength={200}
         required
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-surface-700 mb-1.5">Type *</label>
        <select
         value={formType}
         onChange={(e) => setFormType(e.target.value as WellnessSessionType)}
         className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 bg-white"
         required
        >
         {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
       </div>
      </div>

      <div>
       <label className="block text-sm font-medium text-surface-700 mb-1.5">Description *</label>
       <textarea
        value={formDesc}
        onChange={(e) => setFormDesc(e.target.value)}
        rows={3}
        minLength={1}
        maxLength={5000}
        className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none"
        required
       />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <div>
        <label className="block text-sm font-medium text-surface-700 mb-1.5">Scheduled At *</label>
        <DateTimeInput
         value={formScheduledAt}
         onChange={(v) => setFormScheduledAt(v)}
         required
        />
       </div>
       {editingId && (
        <div>
         <label className="block text-sm font-medium text-surface-700 mb-1.5">Status</label>
         <select
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value as WellnessSessionStatus)}
          className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 bg-white"
         >
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
         </select>
        </div>
       )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <label className="block text-sm font-medium text-surface-700 mb-1.5">Price (INR) *</label>
        <div className="relative">
         <IndianRupee className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
         <input
          type="number"
          value={formPrice}
          onChange={(e) => setFormPrice(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
          placeholder="200"
          min="0"
          step="1"
          required
         />
        </div>
       </div>
       <div>
        <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration (min) *</label>
        <input
         type="number"
         value={formDuration}
         onChange={(e) => setFormDuration(e.target.value)}
         className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
         placeholder="60"
         min="5"
         max="600"
         required
        />
       </div>
       <div>
        <label className="block text-sm font-medium text-surface-700 mb-1.5">Capacity *</label>
        <input
         type="number"
         value={formCapacity}
         onChange={(e) => setFormCapacity(e.target.value)}
         className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
         placeholder="20"
         min="1"
         max="10000"
         required
        />
       </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
       <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white font-medium text-sm rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
       >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {editingId ? 'Update Session' : 'Add Session'}
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

   {/* Sessions list */}
   {loading ? (
    <div className="space-y-3">
     {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-xl border border-surface-100 p-5 animate-pulse">
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
   ) : sessions.length === 0 ? (
    <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
     <Leaf className="w-12 h-12 text-surface-300 mb-4" />
     <h3 className="text-lg font-semibold text-surface-700">No sessions added</h3>
     <p className="text-sm text-surface-500 mt-1">Add your first session to start teaching.</p>
    </div>
   ) : (
    <div className="space-y-3">
     {sessions.map((s) => {
      const price = Number(s.priceInr);
      const active = s.status === 'SCHEDULED' || s.status === 'LIVE';
      const disabled = busyId === s.id;
      return (
       <div
        key={s.id}
        className={`bg-white rounded-xl border p-5 transition-all ${
         active ? 'border-surface-100 hover:border-emerald-200' : 'border-surface-100 opacity-60'
        }`}
       >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
         <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
          <Leaf className="w-5 h-5 text-emerald-500" />
         </div>
         <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
           <h3 className="text-base font-semibold text-surface-800">{s.title}</h3>
           <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {s.type}
           </span>
           <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            s.status === 'LIVE' ? 'bg-red-100 text-red-700' :
            s.status === 'SCHEDULED' ? 'bg-tulsi-green-light/30 text-tulsi-green' :
            'bg-surface-100 text-surface-500'
           }`}>
            {s.status}
           </span>
          </div>
          {s.description && <p className="text-sm text-surface-500 mt-1 line-clamp-2">{s.description}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-surface-500">
           <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDateTime(s.scheduledAt)}</span>
           <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.durationMinutes} min</span>
           <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{s.enrolled ?? 0}/{s.capacity}</span>
           <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{formatCurrency(price)}</span>
          </div>
          {/* Live-room status + editor (revamp) */}
          <div className="mt-2">
           {roomEditId === s.id ? (
            <div className="flex items-center gap-2">
             <input
              type="text"
              value={roomUrlInput}
              onChange={(e) => setRoomUrlInput(e.target.value)}
              placeholder="https://meet.jit.si/your-room"
              className="flex-1 px-3 py-1.5 text-xs border border-surface-200 rounded-lg"
             />
             <button
              onClick={() => void handleSaveRoom(s)}
              disabled={roomSaving}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50"
             >
              {roomSaving ? 'Saving…' : 'Save room'}
             </button>
             <button
              onClick={() => { setRoomEditId(null); setRoomUrlInput(''); }}
              className="px-2 py-1.5 text-xs text-surface-500 hover:bg-surface-100 rounded-lg"
             >
              Cancel
             </button>
            </div>
           ) : (
            <button
             onClick={() => { setRoomEditId(s.id); setRoomUrlInput((s as { roomUrl?: string }).roomUrl ?? ''); }}
             className={`text-xs font-medium inline-flex items-center gap-1 ${
              (s as { roomUrl?: string }).roomUrl ? 'text-tulsi-green' : 'text-amber-600'
             }`}
            >
             <CalendarDays className="w-3 h-3" />
             {(s as { roomUrl?: string }).roomUrl ? 'Room link set — edit' : '+ Set live-class room link'}
            </button>
           )}
          </div>
         </div>
         <div className="flex items-center gap-2 shrink-0">
          <button
           onClick={() => void handleToggleStatus(s)}
           disabled={disabled || s.status === 'COMPLETED'}
           className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
            s.status === 'CANCELLED'
             ? 'bg-tulsi-green-dark text-white hover:opacity-90'
             : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
           }`}
          >
           {s.status === 'CANCELLED' ? 'Reactivate' : 'Cancel'}
          </button>
          <button
           onClick={() => openEditForm(s)}
           disabled={disabled}
           className="p-2 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
          >
           <Pencil className="w-4 h-4" />
          </button>
          <button
           onClick={() => void handleDelete(s.id)}
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
