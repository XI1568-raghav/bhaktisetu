'use client';
export const runtime = 'edge';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
 Search,
 ChevronLeft,
 ChevronRight,
 Eye,
 UserCheck,
 Ban,
 Trash2,
 Loader2,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  getUsers,
  patchUser,
  backendToUiRole,
  type BackendUser,
  type UiRole,
} from '../../../lib/admin-api';

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

// Maps the backend's free-form status string + role array to the UI's
// active/pending/blocked tri-state. Backend sometimes omits status (recent
// rows) — default to active so admins still see the user.
function mapStatus(raw: BackendUser): UserStatus {
  const s = (raw.status ?? '').toLowerCase();
  if (s === 'blocked' || s === 'banned' || s === 'suspended') return 'blocked';
  if (s === 'pending' || s === 'pending_approval' || s === 'awaiting_approval') return 'pending';
  return 'active';
}

function mapUser(raw: BackendUser): AdminUserRow {
  const primary = (raw.roles?.[0] ?? 'DEVOTEE') as keyof typeof backendToUiRole;
  const uiRole = backendToUiRole[primary] ?? 'devotee';
  return {
    id: raw.id,
    name: raw.fullName,
    email: raw.email ?? '',
    role: uiRole,
    status: mapStatus(raw),
    joinedDate: raw.createdAt,
    phone: raw.phone,
  };
}

export default function AdminUsersPage() {
 const { session } = useAuth();
 const token = session?.accessToken;

 const [users, setUsers] = useState<AdminUserRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [roleFilter, setRoleFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [page, setPage] = useState(1);
 const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
 const [actionLoading, setActionLoading] = useState<string | null>(null);

 useEffect(() => {
   if (!token) return;
   let cancelled = false;
   (async () => {
     setLoading(true);
     setError(null);
     try {
       const data = await getUsers(token);
       if (cancelled) return;
       setUsers(data.users.map(mapUser));
     } catch (err) {
       if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load users');
     } finally {
       if (!cancelled) setLoading(false);
     }
   })();
   return () => {
     cancelled = true;
   };
 }, [token]);

 const filtered = useMemo(() => {
 return users.filter((u) => {
 const matchSearch = search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
 const matchRole = roleFilter === 'all' || u.role === roleFilter;
 const matchStatus = statusFilter === 'all' || u.status === statusFilter;
 return matchSearch && matchRole && matchStatus;
 });
 }, [users, search, roleFilter, statusFilter]);

 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
 const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

 const handleApprove = async (userId: string) => {
   setActionLoading(userId + '-approve');
   setError(null);
   try {
     await patchUser(token, userId, { approved: true });
     setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' as UserStatus } : u)));
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Approve failed');
   } finally {
     setActionLoading(null);
   }
 };

 const handleToggleBlock = async (userId: string, currentStatus: UserStatus) => {
   setActionLoading(userId + '-block');
   setError(null);
   const nextBlocked = currentStatus !== 'blocked';
   try {
     await patchUser(token, userId, { blocked: nextBlocked });
     setUsers((prev) =>
       prev.map((u) =>
         u.id === userId
           ? { ...u, status: (nextBlocked ? 'blocked' : 'active') as UserStatus }
           : u,
       ),
     );
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Action failed');
   } finally {
     setActionLoading(null);
   }
 };

 const handleDelete = async (userId: string) => {
   setDeleteConfirm(null);
   setActionLoading(userId + '-delete');
   setError(null);
   // Soft-delete via block — there is no production-ready destructive
   // delete endpoint yet, so we mark blocked and remove from the local view.
   try {
     await patchUser(token, userId, { blocked: true });
     setUsers((prev) => prev.filter((u) => u.id !== userId));
   } catch (err) {
     setError(err instanceof Error ? err.message : 'Delete failed');
   } finally {
     setActionLoading(null);
   }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-lg font-semibold text-surface-800">User Management</h1>
 <p className="text-sm text-surface-500 mt-0.5">Manage all platform users across roles</p>
 </div>

 {error && (
   <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
     {error}
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
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || ''}`}>
 {roleLabels[user.role] || user.role}
 </span>
 </td>
 <td className="py-3 px-4">
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge[user.status] || ''}`}>
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
 <button
 onClick={() => setDeleteConfirm(user.id)}
 className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
 title="Delete"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>

 {/* Delete confirmation */}
 {deleteConfirm === user.id && (
 <div className="absolute right-5 top-full mt-1 z-20 bg-white border border-surface-200 rounded-lg shadow-lg p-4 w-64 text-left">
 <p className="text-sm text-surface-800 font-medium mb-2">Delete this user?</p>
 <p className="text-xs text-surface-500 mb-3">This will block and hide &quot;{user.name}&quot;. The account is not destroyed and can be restored by support.</p>
 <div className="flex gap-2">
 <button
 onClick={() => setDeleteConfirm(null)}
 className="flex-1 px-3 py-1.5 text-xs font-medium text-surface-600 bg-surface-100 rounded-md hover:bg-surface-200 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={() => handleDelete(user.id)}
 className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
 >
 Delete
 </button>
 </div>
 </div>
 )}
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
 Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
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
 className={`w-8 h-8 text-xs font-medium rounded-md transition-colors ${
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
