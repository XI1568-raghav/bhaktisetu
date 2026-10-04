'use client';

/**
 * /admin/users/[id] — the account record behind every row of /admin/users.
 *
 * AO-05 (prod sweep 2026-08-12, P1): this route did not exist. Both the name
 * link and the Eye button on every row pointed here and returned HTTP 404 —
 * 24 dead links on the first page of the table alone, on the screen that is the
 * entry point for every support and moderation task.
 *
 * AO-06 (P1): the only detail screen that DID exist, /admin/users/view?id=,
 * looked the uuid up in a hardcoded map of nine invented people and answered
 * "User not found. This may be a demo limitation." for every real account. It
 * made no API call at all, and its Approve / Block / Reset-password / Delete
 * buttons had no handlers. Its devotee card rendered "12 bookings / Rs. 24,500
 * / Bhakti Pass" for whoever it happened to be shown for — fabricated numbers
 * about a real person, on the screen an operator uses to decide whether that
 * person is a fraud.
 *
 * Two rules this file exists to keep:
 *
 *   NOTHING IS INVENTED. Every value rendered comes from GET /admin/users/:id.
 *   A field the API does not send is not shown, and a failed load is an error,
 *   never an empty profile presented as fact.
 *
 *   NO CONTROL CLAIMS SUCCESS FROM A 200. PATCH /admin/users/:id replied
 *   "User updated" for a `blocked` flag it never wrote (AO-01). Every action
 *   here re-reads the user afterwards and checks the field it asked for.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../../lib/auth-context';
import AuthGuard from '../../../../components/AuthGuard';
import {
  fetchAdminUser,
  patchAdminUser,
  hasUnapprovedProfile,
  AdminUserNotFoundError,
  type AdminUserDetail,
  type AdminUserProfiles,
} from '../users-api';
import { H1 } from '../../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../../lib/friendly-error';

const roleLabels: Record<string, string> = {
  DEVOTEE: 'Devotee',
  PANDIT: 'Pandit',
  STORE_OWNER: 'Store Owner',
  ASTROLOGER: 'Astrologer',
  WELLNESS_INSTRUCTOR: 'Wellness Instructor',
  GAUSHALA_MANAGER: 'Gaushala Manager',
  TEMPLE_MANAGER: 'Temple Manager',
  ADMIN: 'Admin',
};

const roleBadgeColors: Record<string, string> = {
  DEVOTEE: 'bg-blue-50 text-blue-700',
  PANDIT: 'bg-saffron-50 text-saffron-700',
  STORE_OWNER: 'bg-green-50 text-green-700',
  ASTROLOGER: 'bg-purple-50 text-purple-700',
  WELLNESS_INSTRUCTOR: 'bg-teal-50 text-teal-700',
  GAUSHALA_MANAGER: 'bg-amber-50 text-amber-700',
  TEMPLE_MANAGER: 'bg-red-50 text-red-700',
  ADMIN: 'bg-surface-200 text-surface-700',
};

/**
 * Which columns of each provider profile are worth an operator's attention, in
 * the order they should read. Anything not listed is not invented and not shown;
 * anything listed but absent from the payload is skipped, never defaulted — a
 * "0" printed for a missing rating is a claim the API never made.
 */
const PROFILE_VIEWS: Array<{
  key: keyof AdminUserProfiles;
  title: string;
  fields: Array<[string, string]>;
}> = [
  {
    key: 'pandit',
    title: 'Pandit profile',
    fields: [
      ['experience', 'Experience (years)'],
      ['pricePerPuja', 'Price per puja'],
      ['totalPujas', 'Total pujas'],
      ['rating', 'Rating'],
      ['city', 'City'],
      ['state', 'State'],
      ['aadhaarVerified', 'Aadhaar verified'],
      ['availableForAntyeshti', 'Antyeshti available'],
    ],
  },
  {
    key: 'store',
    title: 'Store profile',
    fields: [
      ['storeName', 'Store name'],
      ['gstNumber', 'GST number'],
      ['city', 'City'],
      ['totalProducts', 'Products'],
      ['totalOrders', 'Orders'],
      ['rating', 'Rating'],
    ],
  },
  {
    key: 'astrologer',
    title: 'Astrologer profile',
    fields: [
      ['displayName', 'Display name'],
      ['experience', 'Experience (years)'],
      ['pricePerMinute', 'Price per minute'],
      ['totalConsultations', 'Consultations'],
      ['rating', 'Rating'],
    ],
  },
  {
    key: 'wellness',
    title: 'Wellness profile',
    fields: [
      ['displayName', 'Display name'],
      ['experience', 'Experience (years)'],
      ['pricePerSession', 'Price per session'],
      ['rating', 'Rating'],
    ],
  },
  {
    key: 'gaushala',
    title: 'Gaushala profile',
    fields: [
      ['gaushalaName', 'Gaushala name'],
      ['city', 'City'],
      ['totalCows', 'Cows'],
      ['verified', 'Verified'],
    ],
  },
  {
    key: 'temple',
    title: 'Temple profile',
    fields: [
      ['templeName', 'Temple name'],
      ['deity', 'Deity'],
      ['city', 'City'],
      ['state', 'State'],
      ['totalStreams', 'Darshan streams'],
      ['verified', 'Verified'],
    ],
  },
];

function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'string') return value;
  return null;
}

export default function AdminUserDetailPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminUserDetailContent />
    </AuthGuard>
  );
}

function AdminUserDetailContent() {
  const params = useParams<{ id: string | string[] }>();
  const rawId = params?.id;
  const userId = Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');

  const { session } = useAuth();
  const token = session?.accessToken;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (): Promise<AdminUserDetail | null> => {
    const fresh = await fetchAdminUser(token, userId);
    setUser(fresh);
    return fresh;
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setMissing(false);
      try {
        const fresh = await fetchAdminUser(token, userId);
        if (!cancelled) setUser(fresh);
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        if (err instanceof AdminUserNotFoundError) setMissing(true);
        else setLoadError(userFacingMessage(err, 'Failed to load this user.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  /**
   * Write, then re-read and check. `expected` is evaluated against the user the
   * SERVER returns after the write — not against what we asked for — because a
   * 200 from PATCH /admin/users/:id has already once meant "nothing happened".
   */
  const runAction = useCallback(
    async (
      action: string,
      updates: Parameters<typeof patchAdminUser>[2],
      expected: (fresh: AdminUserDetail) => boolean,
      succeeded: string,
      failed: string,
    ) => {
      setBusy(action);
      setActionError(null);
      setSuccessMessage(null);
      try {
        await patchAdminUser(token, userId, updates);
        const fresh = await load();
        if (!fresh || !expected(fresh)) {
          setActionError(failed);
          return;
        }
        setSuccessMessage(succeeded);
      } catch (err) {
        setActionError(userFacingMessage(err, 'The action could not be completed.'));
      } finally {
        setBusy(null);
      }
    },
    [token, userId, load],
  );

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 text-surface-400 mx-auto mb-3 animate-spin" />
        <p className="text-sm text-surface-500">Loading account…</p>
      </div>
    );
  }

  if (missing) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <p className="text-surface-600">
            No account with id <span className="font-mono text-sm">{userId}</span> exists.
          </p>
          <Link href="/admin/users" className="text-sm text-saffron-600 font-medium mt-2 inline-block">
            Return to user list
          </Link>
        </div>
      </div>
    );
  }

  if (loadError || !user) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {loadError ?? 'This account could not be loaded.'} Nothing below is a statement about
            this user — retry before acting on the account.
          </span>
        </div>
      </div>
    );
  }

  const blocked = user.blocked === true;
  const awaitingApproval = hasUnapprovedProfile(user.profiles);
  const joined = formatDay(user.createdAt);
  const blockedOn = formatDay(user.blockedAt);
  const location = [user.locationCity, user.locationState].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <BackLink />

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Identity */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-saffron-700">
              {(user.fullName || '?').charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className={H1.portal}>{user.fullName}</h1>
              {(user.roles ?? []).map((role) => (
                <span
                  key={role}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    roleBadgeColors[role] ?? 'bg-surface-100 text-surface-600'
                  }`}
                >
                  {roleLabels[role] ?? role}
                </span>
              ))}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  blocked
                    ? 'bg-red-50 text-red-700'
                    : awaitingApproval
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                }`}
              >
                {blocked ? 'blocked' : awaitingApproval ? 'pending approval' : 'active'}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-surface-500 mt-2">
              {user.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
              )}
              {user.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {user.phone}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </span>
              )}
              {joined && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {joined}
                </span>
              )}
              {user.subscriptionTier && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {user.subscriptionTier}
                </span>
              )}
            </div>

            <p className="text-xs text-surface-400 font-mono mt-2">{user.id}</p>
          </div>

          {/* Only actions with a real endpoint behind them. */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {awaitingApproval && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  runAction(
                    'approve',
                    { approved: true },
                    (fresh) => !hasUnapprovedProfile(fresh.profiles),
                    'Approved — the provider profile now reads as approved on the server.',
                    'The server accepted the approval but the profile is still unapproved. Nothing has been approved; do not tell the provider they are live.',
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {busy === 'approve' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                runAction(
                  'block',
                  { blocked: !blocked },
                  (fresh) => (fresh.blocked === true) === !blocked,
                  blocked
                    ? 'Unblocked — the server confirms this account can sign in again.'
                    : 'Blocked — the server confirms this account is now blocked.',
                  blocked
                    ? 'The server accepted the unblock but the account still reads as blocked.'
                    : 'The server accepted the block but the account still reads as active. It can still sign in and take bookings — do not treat this user as blocked.',
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-100 text-surface-700 text-xs font-medium rounded-lg hover:bg-surface-200 disabled:opacity-60 transition-colors"
            >
              {busy === 'block' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Ban className="w-3.5 h-3.5" />
              )}
              {blocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>

        {blocked && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Blocked{blockedOn ? ` on ${blockedOn}` : ''}
            {user.blockedReason ? ` — ${user.blockedReason}` : '. No reason was recorded.'}
          </p>
        )}
      </div>

      {/* Provider profiles — only the ones the API returned. */}
      {PROFILE_VIEWS.map(({ key, title, fields }) => {
        const profile = user.profiles?.[key];
        if (!profile) return null;
        const rows = fields
          .map(([field, label]) => [label, renderValue((profile as Record<string, unknown>)[field])] as const)
          .filter(([, value]) => value !== null);
        const approved = (profile as { approved?: boolean }).approved;

        return (
          <div key={key} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-surface-800">{title}</h2>
              {approved !== undefined && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    approved ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {approved ? 'approved' : 'awaiting approval'}
                </span>
              )}
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-surface-400">
                This profile exists but carries no details yet.
              </p>
            ) : (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-surface-500">{label}</dt>
                    <dd className="text-sm font-medium text-surface-800 mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}

      {/*
        No activity log. The one that used to render here was five invented
        entries ("Logged in from Delhi", "Changed password") shown identically
        for every account — there is no audit-trail endpoint to read.
      */}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700"
    >
      <ArrowLeft className="w-4 h-4" /> Back to Users
    </Link>
  );
}
