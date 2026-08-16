'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
 Search,
 ChevronLeft,
 ChevronRight,
 Eye,
 UserCheck,
 Ban,
 Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AuthGuard from '../../../components/AuthGuard';
import { backendToUiRole, uiToBackendRole, type UiRole } from '../../../lib/admin-api';
import {
  fetchAllAdminUsers,
  fetchPendingApprovalUserIds,
  patchAdminUser,
  type AdminUserRecord,
} from './users-api';
import { H1 } from '../../../components/ui/heading-recipe';

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus = 'active' | 'pending' | 'blocked';

interface AdminUserRow {
 id: string;
 name: string;
 email: string;
 role: UiRole;
 status: UserStatus;
 joinedDate: string;
 phone: string;
 blockedReason: string | null;
}

const roleLabels: Record<string, string> = {
 devotee: 'Devotee',
 priest: 'Pandit',
 store_owner: 'Store Owner',
 astrologer: 'Astrologer',
 wellness_instructor: 'Wellness',
 gaushala_manager: 'Gaushala',
 temple_manager: 'Temple Mgr',
 admin: 'Admin',
};

const roleBadgeColors: Record<string, string> = {
 devotee: 'bg-blue-50 text-blue-700',
 priest: 'bg-saffron-50 text-saffron-700',
 store_owner: 'bg-green-50 text-green-700',
 astrologer: 'bg-purple-50 text-purple-700',
 wellness_instructor: 'bg-teal-50 text-teal-700',
 gaushala_manager: 'bg-amber-50 text-amber-700',
 temple_manager: 'bg-red-50 text-red-700',
 admin: 'bg-surface-200 text-surface-700',
};

const statusBadge: Record<string, string> = {
 active: 'bg-green-50 text-green-700',
 pending: 'bg-amber-50 text-amber-700',
 blocked: 'bg-red-50 text-red-700',
};

const PAGE_SIZE = 10;

// AO-08: status comes from the SERVER, not from a field the API has never sent.
//
// This used to read `raw.status` — a string GET /admin/users does not return —
// so every row fell through to 'active' forever: the Blocked filter answered
// "0 users" while accounts were blocked, and the per-row Approve control, gated
// on status === 'pending', could never render on any row. `blocked` is real
// (User.blocked, returned since the AO-01 fix); "pending" is real too, but it
// lives in the provider profiles, so it arrives from /admin/pending-approvals.
function mapStatus(raw: AdminUserRecord, awaitingApproval: Set<string>): UserStatus {
  if (raw.blocked === true) return 'blocked';
  if (awaitingApproval.has(raw.id)) return 'pending';
  return 'active';
}

function mapUser(raw: AdminUserRecord, awaitingApproval: Set<string>): AdminUserRow {
  const primary = (raw.roles?.[0] ?? 'DEVOTEE') as keyof typeof backendToUiRole;
  const uiRole = backendToUiRole[primary] ?? 'devotee';
  return {
    id: raw.id,
    name: raw.fullName,
    email: raw.email ?? '',
    role: uiRole,
    status: mapStatus(raw, awaitingApproval),
    joinedDate: raw.createdAt,
    phone: raw.phone ?? '',
    blockedReason: raw.blockedReason ?? null,
  };
}

export default function AdminUsersPage() {
 return (
  <AuthGuard allowedRoles={['admin']}>
   <AdminUsersPageContent />
  </AuthGuard>
 );
}

function AdminUsersPageContent() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [users, setUsers] = useState<AdminUserRow[]>([]);
 // AO-07: the server's own count. `users.length` is what the page HAS; this is
 // what the platform has, and the two must be shown to agree.
 const [apiTotal, setApiTotal] = useState(0);
 const [partialDirectory, setPartialDirectory] = useState(false);
 const [approvalsError, setApprovalsError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [roleFilter, setRoleFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [page, setPage] = useState(1);
 const [actionLoading, setActionLoading] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);

 useEffect(() => {
   if (!token) return;
   let cancelled = false;
   (async () => {
     setLoading(true);
     setError(null);
     setApprovalsError(null);

     // Which users are awaiting approval is a SEPARATE, non-blocking call: if
     // it fails the directory is still correct, it just cannot offer Approve —
     // and it says so instead of silently showing everyone as active.
     let awaiting = new Set<string>();
     try {
       awaiting = await fetchPendingApprovalUserIds(token);
     } catch (err) {
       if (!cancelled) {
         setApprovalsError(err instanceof Error ? err.message : 'Could not load the approval queue.');
       }
     }

     try {
       const data = await fetchAllAdminUsers(token);
       if (cancelled) return;
       setUsers(data.users.map((u) => mapUser(u, awaiting)));
       setApiTotal(data.total);
       setPartialDirectory(!data.complete);
     } catch (err) {
       if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load users');
     } finally {
       if (!cancelled) setLoading(false);
     }
   })();
   return () => {
     cancelled = true;
   };
 }, [token, reloadKey]);

 // Filtering runs over the COMPLETE directory, never over one API page, and
 // never through `?role=` — admin.service applies that filter after paginating,
 // so the server would answer "the pandits that happen to be on page 1".
 const filtered = useMemo(() => {
 return users.filter((u) => {
 const matchSearch = search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
 const matchRole = roleFilter === 'all' || u.role === roleFilter;
 const matchStatus = statusFilter === 'all' || u.status === statusFilter;
 return matchSearch && matchRole && matchStatus;
 });
 }, [users, search, roleFilter, statusFilter]);

 const filtersActive = search !== '' || roleFilter !== 'all' || statusFilter !== 'all';
 // Unfiltered, the footer must show what the SERVER says exists — a client-side
 // count can only ever report what was successfully fetched.
 const shownTotal = filtersActive ? filtered.length : Math.max(apiTotal, users.length);
 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

 /**
  * Run a moderation write and PROVE it landed.
  *
  * PATCH /admin/users/:id answered 200 `{"message":"User updated"}` for a
  * `blocked` flag it never wrote (AO-01), and this table believed it because it
  * mutated local state optimistically — an operator blocking a fraudulent
  * pandit got a green badge over an account that stayed fully live. So the
  * only evidence accepted here is a re-read of the directory that shows the
  * user in the state we asked for.
  */
 type Verdict = { ok: true } | { ok: false; message: string };

 const applyAndVerify = async (
   userId: string,
   action: string,
   updates: Parameters<typeof patchAdminUser>[2],
   // `awaiting` is null when the approval queue could not be re-read. That is
   // NOT the same as "the queue is empty" — treating it as empty is how a
   // failed verification turns into a green confirmation.
   verify: (row: AdminUserRecord | undefined, awaiting: Set<string> | null) => Verdict,
 ) => {
   setActionLoading(userId + '-' + action);
   setError(null);
   try {
     await patchAdminUser(token, userId, updates);

     const [awaitingResult, data] = await Promise.all([
       fetchPendingApprovalUserIds(token).then(
         (s) => s,
         () => null,
       ),
       fetchAllAdminUsers(token),
     ]);
     const row = data.users.find((u) => u.id === userId);
     setUsers(data.users.map((u) => mapUser(u, awaitingResult ?? new Set<string>())));
     setApiTotal(data.total);
     setPartialDirectory(!data.complete);
     if (!awaitingResult) {
       setApprovalsError('the approval queue could not be re-read');
     }

     const verdict = verify(row, awaitingResult);
     if (!verdict.ok) setError(verdict.message);
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Action failed');
   } finally {
     setActionLoading(null);
   }
 };

 const handleApprove = (userId: string) =>
   applyAndVerify(userId, 'approve', { approved: true }, (_row, awaiting) => {
     if (!awaiting) {
       return {
         ok: false,
         message:
           'The server accepted the approval, but the approval queue could not be re-read, so it is unconfirmed. Check /admin/approvals before telling the provider they are live.',
       };
     }
     if (awaiting.has(userId)) {
       return {
         ok: false,
         message:
           'The server accepted the approval but this account is still in the approval queue. Nothing has been approved.',
       };
     }
     return { ok: true };
   });

 const handleToggleBlock = (userId: string, currentStatus: UserStatus) => {
   const nextBlocked = currentStatus !== 'blocked';
   return applyAndVerify(userId, 'block', { blocked: nextBlocked }, (row) => {
     if (row && (row.blocked === true) === nextBlocked) return { ok: true };
     return {
       ok: false,
       message: nextBlocked
         ? 'The server accepted the block but the account still reads as active. It can still sign in and take bookings — do not treat this user as blocked.'
         : 'The server accepted the unblock but the account still reads as blocked.',
     };
   });
 };

 const handleRoleChange = (userId: string, nextUiRole: UiRole) =>
   applyAndVerify(userId, 'role', { roles: [uiToBackendRole[nextUiRole]] }, (row) =>
     row && (row.roles?.[0] ?? '') === uiToBackendRole[nextUiRole]
       ? { ok: true }
       : {
           ok: false,
           message: 'The server accepted the role change but the account still holds its old role.',
         },
   );

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className={H1.portal}>User Management</h1>
 <p className="text-sm text-surface-500 mt-0.5">Manage all platform users across roles</p>
 </div>

 {error && (
   <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     <span>{error}</span>
     <button
       type="button"
       onClick={() => setReloadKey((k) => k + 1)}
       className="shrink-0 rounded-md border border-red-300 px-2 py-1 text-xs font-medium hover:bg-red-100"
     >
       Reload
     </button>
   </div>
 )}

 {partialDirectory && (
   <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
     Only {users.length} of {apiTotal} users could be loaded. This list is incomplete — do not
     read a filter count as the whole picture.
   </div>
 )}

 {approvalsError && (
   <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
     The approval queue could not be loaded ({approvalsError}), so accounts awaiting approval are
     not marked here and Approve is unavailable. Nobody has been approved or rejected.
   </div>
 )}

 {/* Filters */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 placeholder="Search by name or email..."
 value={search}
 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
 className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-500/30 focus:border-saffron-500"
 />
 </div>
 <select
 aria-label="Filter by role"
 value={roleFilter}
 onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
 className="px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
 >
 <option value="all">All Roles</option>
 <option value="devotee">Devotee</option>
 <option value="priest">Pandit</option>
 <option value="store_owner">Store Owner</option>
 <option value="astrologer">Astrologer</option>
 <option value="wellness_instructor">Wellness Instructor</option>
 <option value="gaushala_manager">Gaushala Manager</option>
 <option value="temple_manager">Temple Manager</option>
 </select>
 <select
 aria-label="Filter by status"
 value={statusFilter}
 onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
 className="px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
 >
 <option value="all">All Status</option>
 <option value="active">Active</option>
 <option value="pending">Pending</option>
 <option value="blocked">Blocked</option>
 </select>
 </div>

 {/* Table */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
 {loading ? (
   <div className="p-12 text-center">
     <Loader2 className="w-6 h-6 text-surface-400 mx-auto mb-3 animate-spin" />
     <p className="text-sm text-surface-500">Loading users…</p>
   </div>
 ) : (
 <>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-[var(--color-border)] bg-surface-50/50">
 <th className="text-left py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Name</th>
 <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Email</th>
 <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
 <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
 <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
 <th className="text-right py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Actions</th>
 </tr>
 </thead>
 <tbody>
 {paginated.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-surface-400">
 No users match your filters.
 </td>
 </tr>
 ) : (
 paginated.map((user, i) => (
 <tr
 key={user.id}
 className={`border-b border-[var(--color-border)] last:border-0 hover:bg-surface-50/80 transition-colors ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
 >
 <td className="py-3 px-5">
 <Link href={`/admin/users/${user.id}`} className="font-medium text-surface-800 hover:text-saffron-600 transition-colors">
 {user.name}
 </Link>
 </td>
 <td className="py-3 px-4 text-surface-500 hidden md:table-cell">{user.email}</td>
 <td className="py-3 px-4">
 <select
   value={user.role}
   onChange={(e) => handleRoleChange(user.id, e.target.value as UiRole)}
   disabled={actionLoading === user.id + '-role'}
   className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer disabled:opacity-50 ${roleBadgeColors[user.role] || ''}`}
   title="Change role"
 >
   {Object.entries(roleLabels).map(([value, label]) => (
     <option key={value} value={value}>{label}</option>
   ))}
 </select>
 </td>
 <td className="py-3 px-4">
 <span
 title={user.status === 'blocked' && user.blockedReason ? user.blockedReason : undefined}
 className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[user.status] || ''}`}
 >
 {user.status}
 </span>
 </td>
 <td className="py-3 px-4 text-surface-500 hidden lg:table-cell">
 {new Date(user.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
 </td>
 <td className="py-3 px-5 text-right relative">
 <div className="flex items-center justify-end gap-1">
 <Link
 href={`/admin/users/${user.id}`}
 className="p-1.5 text-surface-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-md transition-colors"
 title="View"
 >
 <Eye className="w-4 h-4" />
 </Link>
 {user.status === 'pending' && (
 <button
 onClick={() => handleApprove(user.id)}
 disabled={actionLoading === user.id + '-approve'}
 className="p-1.5 text-surface-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-40"
 title="Approve"
 >
 <UserCheck className={`w-4 h-4 ${actionLoading === user.id + '-approve' ? 'animate-spin' : ''}`} />
 </button>
 )}
 <button
 onClick={() => handleToggleBlock(user.id, user.status)}
 disabled={actionLoading === user.id + '-block'}
 className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
 user.status === 'blocked'
 ? 'text-amber-600 hover:text-green-600 hover:bg-green-50'
 : 'text-surface-400 hover:text-amber-600 hover:bg-amber-50'
 }`}
 title={user.status === 'blocked' ? 'Unblock' : 'Block'}
 >
 <Ban className="w-4 h-4" />
 </button>
 {/*
   The Delete control that used to sit here answered by blocking the user
   and REMOVING THE ROW, so an operator got positive visual evidence the
   account was gone while it was merely suspended — and DELETE
   /admin/users/:id is a stub that replies "User deleted" for any id,
   including ones that do not exist (AO-16). A control with no rail behind
   it does more damage than a missing one; Block is the real action and it
   is verified above.
 */}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
 <span className="text-xs text-surface-500">
 Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {shownTotal} users
 </span>
 <div className="flex items-center gap-1">
 <button
 onClick={() => setPage(Math.max(1, page - 1))}
 disabled={page === 1}
 className="p-1.5 text-surface-400 hover:text-surface-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-surface-100 transition-colors"
 >
 <ChevronLeft className="w-4 h-4" />
 </button>
 {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
 <button
 key={p}
 onClick={() => setPage(p)}
 className={`h-11 w-11 text-xs font-medium rounded-md transition-colors ${
 p === page
 ? 'bg-saffron-600 text-white'
 : 'text-surface-500 hover:bg-surface-100'
 }`}
 >
 {p}
 </button>
 ))}
 <button
 onClick={() => setPage(Math.min(totalPages, page + 1))}
 disabled={page === totalPages}
 className="p-1.5 text-surface-400 hover:text-surface-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-surface-100 transition-colors"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 );
}
