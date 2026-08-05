'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, EyeOff, Loader2, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { friendlyApiError } from '../../../lib/friendly-error';

interface AdminRating {
  id: string;
  userId: string;
  providerId: string;
  providerType: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  isHidden: boolean;
}

const STAR_OPTIONS = [
  { value: '', label: 'All stars' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4 stars' },
  { value: '3', label: '3 stars' },
  { value: '2', label: '2 stars' },
  { value: '1', label: '1 star' },
];

export default function AdminRatingsPage() {
  const { session } = useAuth();
  const [stars, setStars] = useState('');
  const [providerId, setProviderId] = useState('');
  const [rows, setRows] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiding, setHiding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (stars) sp.set('stars', stars);
      if (providerId.trim()) sp.set('providerId', providerId.trim());
      sp.set('pageSize', '100');
      const res = await fetch(`${API_BASE_URL}/admin/ratings?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setRows((json.data ?? []) as AdminRating[]);
      setTotal(Number(json.total) || 0);
    } catch (e) {
      // P1 #208: map raw "API 401" style errors to friendly copy.
      setError(friendlyApiError(e).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, stars, providerId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const handleHide = async (id: string) => {
    if (!confirm('Hide this rating from public view?')) return;
    setHiding(id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/ratings/${id}/hide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      const json = await res.json();
      if (json.skipped) {
        alert(
          `Hide skipped: ${json.reason ?? 'isHidden column missing in schema. Moderator intent logged.'}`,
        );
      } else {
        // Optimistically mark as hidden in UI.
        setRows((cur) => cur.map((r) => (r.id === id ? { ...r, isHidden: true } : r)));
      }
    } catch {
      alert('Failed to hide rating.');
    } finally {
      setHiding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Ratings Moderation</h1>
          <p className="text-sm text-surface-500 mt-1">
            All provider ratings posted on Darshya. {total} total.
          </p>
        </div>
        <button
          onClick={fetchRatings}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-600 hover:bg-surface-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-surface-100 bg-white p-4 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-surface-400" />
        <select
          value={stars}
          onChange={(e) => setStars(e.target.value)}
          className="rounded-lg border border-surface-200 px-3 py-2 text-sm"
        >
          {STAR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          placeholder="Filter by provider ID"
          className="rounded-lg border border-surface-200 px-3 py-2 text-sm flex-1 min-w-[240px]"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-surface-100 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-500">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-surface-500 text-sm">No ratings match your filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-surface-600">Stars</th>
                <th className="px-4 py-3 text-left font-medium text-surface-600">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-surface-600">Comment</th>
                <th className="px-4 py-3 text-left font-medium text-surface-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-surface-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-surface-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-surface-50 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      <span className="font-semibold">{r.rating}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-600">
                    <div>{r.providerType}</div>
                    <div className="text-surface-400">{r.providerId.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-surface-700 max-w-md">
                    {r.comment ? (
                      <span className="line-clamp-2">{r.comment}</span>
                    ) : (
                      <span className="text-surface-400 italic">No comment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {r.isHidden ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Visible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleHide(r.id)}
                      disabled={hiding === r.id || r.isHidden}
                      className="inline-flex items-center gap-1 rounded-lg border border-surface-200 px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-50 disabled:opacity-50"
                    >
                      {hiding === r.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      Hide
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
