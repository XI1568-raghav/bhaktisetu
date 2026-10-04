'use client';

/**
 * AddressManager — devotee address management on /profile (devotee revamp
 * 2026-08-05). The backend GET/POST/PATCH/DELETE /users/me/addresses endpoints
 * existed but had NO UI, so devotees couldn't manage delivery addresses used
 * for prasad/at-home puja. This closes that gap.
 */

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Star, Loader2, X } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import { buttonClass } from '../../components/ui/button-recipe';
import { serverErrorMessage } from '../../lib/friendly-error';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

const emptyForm = { label: 'home', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function AddressManager() {
  const { session } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${session?.accessToken ?? ''}`, 'Content-Type': 'application/json' }),
    [session?.accessToken],
  );

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/addresses`, { headers: headers() });
      if (res.ok) {
        const j = await res.json();
        setAddresses(j.addresses ?? []);
      }
    } catch { /* keep list */ }
    setLoading(false);
  }, [session?.accessToken, headers]);

  useEffect(() => { load(); }, [load]);

  async function addAddress() {
    setError(null);
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      setError('Please fill line 1, city, state and pincode.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/addresses`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
      });
      if (res.ok) {
        setForm(emptyForm);
        setShowForm(false);
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(serverErrorMessage(j, 'Could not save address.'));
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    try {
      await fetch(`${API_BASE_URL}/users/me/addresses/${id}`, { method: 'DELETE', headers: headers() });
      setAddresses((a) => a.filter((x) => x.id !== id));
    } catch { /* keep */ }
  }

  async function setDefault(id: string) {
    try {
      await fetch(`${API_BASE_URL}/users/me/addresses/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ isDefault: true }),
      });
      await load();
    } catch { /* keep */ }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-surface-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-saffron-600" />
          Delivery Addresses
        </h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1 text-sm font-medium text-saffron-600 hover:text-saffron-700"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Close' : 'Add'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-surface-400">Loading…</p>
      ) : addresses.length === 0 && !showForm ? (
        <p className="text-sm text-surface-500">
          No addresses yet. Add one for prasad delivery and at-home puja visits.
        </p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-surface-100 p-3">
              <MapPin className="w-4 h-4 text-saffron-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium text-surface-800 flex items-center gap-2">
                  {a.label}
                  {a.isDefault && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-saffron-100 text-saffron-700">DEFAULT</span>
                  )}
                </p>
                <p className="text-surface-600">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!a.isDefault && (
                  <button onClick={() => setDefault(a.id)} title="Set default" className="text-surface-400 hover:text-saffron-600">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => remove(a.id)} title="Delete" className="text-surface-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mt-4 rounded-lg border border-saffron-100 bg-saffron-50/50 p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (home/work)" className="px-3 py-2 text-sm border border-surface-200 rounded-lg" />
            <input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" className="px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          </div>
          <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="Address line 1" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Address line 2 (optional)" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          <div className="grid grid-cols-2 gap-2.5">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="px-3 py-2 text-sm border border-surface-200 rounded-lg" />
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={addAddress}
            disabled={saving}
            className={buttonClass('primary', 'md')}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </div>
      )}
    </div>
  );
}
