'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  XCircle,
  Eye,
  Calendar,
  MapPin,
  Filter,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage, UserFacingError, serverErrorMessage } from '../../../lib/friendly-error';

// Backend returns aggregated rows from getPendingApprovals():
//   { id, userId, role: 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' |
//                       'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' |
//                       'TEMPLE_MANAGER',
//     profileName, city, createdAt }
// The UI uses lowercase role keys for filter + colour mapping, so we
// normalise on read.
type BackendRole =
  | 'PANDIT'
  | 'STORE_OWNER'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA_MANAGER'
  | 'TEMPLE_MANAGER';

type BackendApproval = {
  id: string;
  userId: string;
  role: BackendRole;
  profileName: string;
  city: string | null;
  createdAt: string;
};

type UiRole =
  | 'priest'
  | 'store_owner'
  | 'astrologer'
  | 'wellness_instructor'
  | 'gaushala_manager'
  | 'temple_manager';

const backendToUi: Record<BackendRole, UiRole> = {
  PANDIT: 'priest',
  STORE_OWNER: 'store_owner',
  ASTROLOGER: 'astrologer',
  WELLNESS_INSTRUCTOR: 'wellness_instructor',
  GAUSHALA_MANAGER: 'gaushala_manager',
  TEMPLE_MANAGER: 'temple_manager',
};

interface PendingApproval {
  id: string;
  userId: string;
  name: string;
  role: UiRole;
  city: string;
  submittedDate: string;
}

const roleLabels: Record<UiRole, string> = {
  priest: 'Pandit',
  store_owner: 'Store Owner',
  astrologer: 'Astrologer',
  wellness_instructor: 'Wellness Instructor',
  gaushala_manager: 'Gaushala Manager',
  temple_manager: 'Temple Manager',
};

const roleBadgeColors: Record<UiRole, string> = {
  priest: 'bg-saffron-50 text-saffron-700 border-saffron-200',
  store_owner: 'bg-green-50 text-green-700 border-green-200',
  astrologer: 'bg-purple-50 text-purple-700 border-purple-200',
  wellness_instructor: 'bg-teal-50 text-teal-700 border-teal-200',
  gaushala_manager: 'bg-amber-50 text-amber-700 border-amber-200',
  temple_manager: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminApprovalsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/pending-approvals`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // RES-09: the server's own sentence when it wrote one worth reading,
          // friendly copy for the status otherwise — never `(500): <raw body>`.
          const body = await res.json().catch(() => null);
          throw new UserFacingError(
            serverErrorMessage(
              body,
              userFacingMessage(new Error(`HTTP ${res.status}`), 'Could not load approvals.'),
            ),
            res.status,
          );
        }
        const data = (await res.json()) as { approvals: BackendApproval[]; total: number };
        if (cancelled) return;
        setApprovals(
          data.approvals.map((row) => ({
            id: row.id,
            userId: row.userId,
            name: row.profileName,
            role: backendToUi[row.role],
            city: row.city ?? '—',
            submittedDate: row.createdAt,
          })),
        );
      } catch (err) {
        if (!cancelled) setError(userFacingMessage(err, 'Failed to load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = roleFilter === 'all'
    ? approvals
    : approvals.filter((a) => a.role === roleFilter);

  const patchUser = async (userId: string, approved: boolean) => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approved }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  };

  const handleApprove = async (approval: PendingApproval) => {
    setActionLoading(approval.id + '-approve');
    try {
      await patchUser(approval.userId, true);
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
    } catch (err) {
      setError(userFacingMessage(err, 'Approve failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approval: PendingApproval) => {
    setActionLoading(approval.id + '-reject');
    try {
      await patchUser(approval.userId, false);
      setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      setError(userFacingMessage(err, 'Reject failed'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={H1.portal}>Provider Approvals</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {loading ? 'Loading…' : `${approvals.length} pending approval${approvals.length === 1 ? '' : 's'} require review`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-surface-400" />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
        >
          <option value="all">All Roles ({approvals.length})</option>
          <option value="priest">Pandits</option>
          <option value="store_owner">Store Owners</option>
          <option value="astrologer">Astrologers</option>
          <option value="wellness_instructor">Wellness Instructors</option>
          <option value="gaushala_manager">Gaushala Managers</option>
          <option value="temple_manager">Temple Managers</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <Loader2 className="w-6 h-6 text-surface-400 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-surface-500">Loading pending approvals…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <UserCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-800 mb-1">All caught up!</h3>
          <p className="text-sm text-surface-500">
            No pending approvals{roleFilter !== 'all' ? ' for this role' : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((approval) => (
            <div
              key={approval.id}
              className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-saffron-700">
                      {approval.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-surface-800">{approval.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleBadgeColors[approval.role] || ''}`}>
                        {roleLabels[approval.role] || approval.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-surface-500 mb-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{approval.city}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Submitted {new Date(approval.submittedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(approval)}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    {actionLoading === approval.id + '-approve' ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving…</>
                    ) : (
                      <><UserCheck className="w-3.5 h-3.5" /> Approve</>
                    )}
                  </button>
                  <button
                    onClick={() => setRejectModal(approval.id)}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <Link
                    href={`/admin/users/${approval.userId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-100 text-surface-600 text-xs font-medium rounded-lg hover:bg-surface-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </div>
              </div>

              {rejectModal === approval.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Rejection reason for {approval.name}</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide a reason for rejection (kept locally for now; backend reason field pending)…"
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-red-300 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setRejectModal(null); setRejectReason(''); }}
                      className="px-3 py-1.5 text-xs font-medium text-surface-600 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(approval)}
                      disabled={actionLoading === approval.id + '-reject'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                      {actionLoading === approval.id + '-reject' ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Rejecting…</>
                      ) : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
