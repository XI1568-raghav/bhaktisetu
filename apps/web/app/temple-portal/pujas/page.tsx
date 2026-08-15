'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  Plus,
  Pencil,
  Trash2,
  X,
  IndianRupee,
  Save,
  Loader2,
  UserCircle,
  AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import {
  listTemplePujasWithLinkState,
  createTemplePuja,
  updateTemplePuja,
  deleteTemplePuja,
  listPublicPriests,
  listPujaTypes,
  type TemplePujaOffering,
  type CreateTemplePujaInput,
  type PublicPriestSummary,
  type PujaTypeSummary,
} from '../../../lib/temple-api';

// ─── Helpers ────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────

export default function TemplePujasPage() {
  return (
    <AuthGuard allowedRoles={['temple_manager', 'admin']}>
      <TemplePujasPageContent />
    </AuthGuard>
  );
}

function TemplePujasPageContent() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [pujas, setPujas] = useState<TemplePujaOffering[]>([]);
  const [priests, setPriests] = useState<PublicPriestSummary[]>([]);
  const [pujaTypes, setPujaTypes] = useState<PujaTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // S-06: non-null when this manager has no linked Temple. Every offering
  // create would 409 in that state; the page used to invite the action anyway
  // and then render the raw backend string.
  const [templeLinkIssue, setTempleLinkIssue] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formPujaTypeId, setFormPujaTypeId] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formNriPrice, setFormNriPrice] = useState('');
  const [formPriestId, setFormPriestId] = useState('');
  const [formMaxBookings, setFormMaxBookings] = useState('1');
  // Temple revamp: the API accepted availableSlots (the daily time slots a
  // devotee can book) but the form never collected them — every offering was
  // created with an empty slot list, so nothing was bookable. Add a slot editor.
  const [formSlots, setFormSlots] = useState('');

  const pujaTypeById = useMemo(() => {
    const m = new Map<string, PujaTypeSummary>();
    pujaTypes.forEach((t) => m.set(t.id, t));
    return m;
  }, [pujaTypes]);

  const priestById = useMemo(() => {
    const m = new Map<string, PublicPriestSummary>();
    priests.forEach((p) => m.set(p.id, p));
    return m;
  }, [priests]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [pujaResult, priestList, typeList] = await Promise.all([
        listTemplePujasWithLinkState(token),
        listPublicPriests(),
        listPujaTypes(),
      ]);
      setPujas(pujaResult.offerings);
      // S-06: an unlinked temple account cannot save any offering. Say so
      // instead of showing an empty list that looks like "nothing added yet".
      setTempleLinkIssue(pujaResult.templeLinked ? null : (pujaResult.linkMessage ?? 'This account is not linked to a temple yet, so offerings cannot be saved.'));
      setPriests(priestList);
      setPujaTypes(typeList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pujas');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, load]);

  function resetForm() {
    setFormPujaTypeId('');
    setFormPrice('');
    setFormNriPrice('');
    setFormPriestId('');
    setFormMaxBookings('1');
    setFormSlots('');
    setEditingId(null);
    setShowForm(false);
  }

  function openEditForm(p: TemplePujaOffering) {
    setFormPujaTypeId(p.pujaTypeId);
    setFormPrice(p.priceOverride ?? '');
    setFormNriPrice(p.nriPrice ?? '');
    setFormPriestId(p.assignedPriestId ?? '');
    setFormMaxBookings(String(p.maxBookingsPerSlot));
    // Pre-fill the slot editor from the offering's existing availableSlots.
    const slots = Array.isArray(p.availableSlots)
      ? p.availableSlots.map((s) => (typeof s === 'string' ? s : (s as { time?: string })?.time ?? '')).filter(Boolean).join(', ')
      : '';
    setFormSlots(slots);
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !formPujaTypeId) return;
    setSaving(true);
    setError(null);
    const body: CreateTemplePujaInput = {
      pujaTypeId: formPujaTypeId,
      priceOverride: formPrice ? Number(formPrice) : null,
      nriPrice: formNriPrice ? Number(formNriPrice) : null,
      assignedPriestId: formPriestId || null,
      maxBookingsPerSlot: Number(formMaxBookings) || 1,
      // Parse the comma/space-separated slot editor into the availableSlots
      // string array the booking slot-picker consumes (e.g. "06:00, 10:00").
      availableSlots: formSlots
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
    try {
      if (editingId) {
        const updated = await updateTemplePuja(token, editingId, body);
        setPujas((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createTemplePuja(token, body);
        setPujas((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: TemplePujaOffering) {
    if (!token) return;
    setBusyId(p.id);
    const prev = pujas;
    setPujas((cur) =>
      cur.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x)),
    );
    try {
      const updated = await updateTemplePuja(token, p.id, { isActive: !p.isActive });
      setPujas((cur) => cur.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setPujas(prev);
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this puja offering?')) return;
    setBusyId(id);
    const prev = pujas;
    setPujas((cur) => cur.filter((x) => x.id !== id));
    try {
      await deleteTemplePuja(token, id);
    } catch (err) {
      setPujas(prev);
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-40 bg-surface-100 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
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
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          disabled={!!templeLinkIssue}
          title={templeLinkIssue ?? undefined}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Add Puja
        </button>
      </div>

      {templeLinkIssue && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">No temple linked to this account</p>
            <p className="mt-0.5">{templeLinkIssue}</p>
          </div>
        </div>
      )}

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

      {showForm && (
        <div className="bg-white rounded-xl border border-saffron-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">
              {editingId ? 'Edit Puja' : 'Add New Puja'}
            </h2>
            <button
              onClick={resetForm}
              className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Puja Type *
              </label>
              <select
                value={formPujaTypeId}
                onChange={(e) => setFormPujaTypeId(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 bg-white"
                required
                disabled={Boolean(editingId)}
              >
                <option value="">Select a puja type</option>
                {pujaTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.deity ? ` — ${t.deity}` : ''}
                  </option>
                ))}
              </select>
              {pujaTypes.length === 0 && (
                <p className="text-xs text-surface-500 mt-1">
                  No puja types available. Contact admin to seed catalog.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Price Override (INR)
                </label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  min="0"
                  step="0.01"
                  placeholder="Leave blank for default"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  NRI Price (INR)
                </label>
                <input
                  type="number"
                  value={formNriPrice}
                  onChange={(e) => setFormNriPrice(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  min="0"
                  step="0.01"
                  placeholder="9-10x domestic"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Max Bookings / Slot
                </label>
                <input
                  type="number"
                  value={formMaxBookings}
                  onChange={(e) => setFormMaxBookings(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  min="1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Assigned Priest
              </label>
              <select
                value={formPriestId}
                onChange={(e) => setFormPriestId(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 bg-white"
              >
                <option value="">Unassigned</option>
                {priests.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                    {p.isVerified ? ' (verified)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Available Time Slots
              </label>
              <input
                type="text"
                value={formSlots}
                onChange={(e) => setFormSlots(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                placeholder="e.g. 06:00, 10:00, 18:00"
              />
              <p className="text-xs text-surface-400 mt-1">
                Comma-separated daily slots devotees can book (24h). Leave blank to use the puja's default slots.
              </p>
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
                {editingId ? 'Update' : 'Add Puja'}
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

      {pujas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Flame className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No pujas added</h3>
          <p className="text-sm text-surface-500 mt-1">
            Click &quot;Add Puja&quot; to create your first offering.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pujas.map((puja) => {
            const type = pujaTypeById.get(puja.pujaTypeId);
            const priest = puja.assignedPriestId
              ? priestById.get(puja.assignedPriestId)
              : null;
            const price = puja.priceOverride ? Number(puja.priceOverride) : 0;
            const nri = puja.nriPrice ? Number(puja.nriPrice) : 0;
            const isBusy = busyId === puja.id;
            return (
              <div
                key={puja.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  puja.isActive
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
                      <h3 className="text-base font-semibold text-surface-800">
                        {type?.name ?? `Puja ${puja.pujaTypeId.slice(0, 8)}`}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          puja.isActive
                            ? 'bg-tulsi-green-light/30 text-tulsi-green'
                            : 'bg-surface-100 text-surface-500'
                        }`}
                      >
                        {puja.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {type?.deity && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
                          {type.deity}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-surface-500">
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {price > 0 ? formatCurrency(price) : 'Default price'}
                      </span>
                      {nri > 0 && (
                        <span className="text-xs text-surface-400">
                          NRI: {formatCurrency(nri)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <UserCircle className="w-3.5 h-3.5" />
                        {priest?.displayName ?? 'Unassigned'}
                      </span>
                      <span className="text-xs text-surface-400">
                        Max {puja.maxBookingsPerSlot}/slot
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleToggleActive(puja)}
                      disabled={isBusy}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        puja.isActive
                          ? 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                          : 'bg-tulsi-green-dark text-white hover:opacity-90'
                      }`}
                    >
                      {puja.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditForm(puja)}
                      disabled={isBusy}
                      className="p-2 text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void handleDelete(puja.id)}
                      disabled={isBusy}
                      className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
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
