'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck,
  Ban,
  Trash2,
  MoreVertical,
} from 'lucide-react';

// ── Mock Users ────────────────────────────────────────────────────────────────

type UserStatus = 'active' | 'pending' | 'blocked';
type UserRole = 'devotee' | 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager';

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedDate: string;
  phone: string;
}

const mockUsers: MockUser[] = [
  { id: 'u001', name: 'Arjun Sharma', email: 'arjun.sharma@gmail.com', role: 'devotee', status: 'active', joinedDate: '2025-11-12', phone: '+919876543210' },
  { id: 'u002', name: 'Pandit Ramesh Sharma', email: 'ramesh.sharma@gmail.com', role: 'priest', status: 'active', joinedDate: '2025-10-05', phone: '+919876543211' },
  { id: 'u003', name: 'Vikram Patel', email: 'vikram.patel@gmail.com', role: 'store_owner', status: 'active', joinedDate: '2025-09-20', phone: '+919876543212' },
  { id: 'u004', name: 'Jyotishi Suresh Kumar', email: 'suresh.k@gmail.com', role: 'astrologer', status: 'pending', joinedDate: '2026-04-10', phone: '+919876543213' },
  { id: 'u005', name: 'Ananya Devi', email: 'ananya.devi@gmail.com', role: 'wellness_instructor', status: 'active', joinedDate: '2025-12-01', phone: '+919876543214' },
  { id: 'u006', name: 'Govind Prasad', email: 'govind.prasad@gmail.com', role: 'gaushala_manager', status: 'pending', joinedDate: '2026-03-22', phone: '+919876543215' },
  { id: 'u007', name: 'Swami Dayananda', email: 'swami.d@gmail.com', role: 'temple_manager', status: 'active', joinedDate: '2025-08-15', phone: '+919876543216' },
  { id: 'u008', name: 'Priya Kumari', email: 'priya.kumari@gmail.com', role: 'devotee', status: 'active', joinedDate: '2026-01-15', phone: '+919876543217' },
  { id: 'u009', name: 'Ravi Tiwari', email: 'ravi.tiwari@gmail.com', role: 'priest', status: 'pending', joinedDate: '2026-04-14', phone: '+919876543218' },
  { id: 'u010', name: 'Arun Mehta', email: 'arun.mehta@gmail.com', role: 'store_owner', status: 'pending', joinedDate: '2026-04-13', phone: '+919876543219' },
  { id: 'u011', name: 'Deepa Nair', email: 'deepa.nair@gmail.com', role: 'devotee', status: 'active', joinedDate: '2026-02-20', phone: '+919876543220' },
  { id: 'u012', name: 'Rakesh Tiwari', email: 'rakesh.t@gmail.com', role: 'astrologer', status: 'active', joinedDate: '2025-07-11', phone: '+919876543221' },
  { id: 'u013', name: 'Sneha Desai', email: 'sneha.desai@gmail.com', role: 'wellness_instructor', status: 'active', joinedDate: '2025-11-30', phone: '+919876543222' },
  { id: 'u014', name: 'Govind Yadav', email: 'govind.y@gmail.com', role: 'gaushala_manager', status: 'active', joinedDate: '2025-06-14', phone: '+919876543223' },
  { id: 'u015', name: 'Meera Joshi', email: 'meera.j@gmail.com', role: 'devotee', status: 'blocked', joinedDate: '2025-05-20', phone: '+919876543224' },
  { id: 'u016', name: 'Rajesh Pandey', email: 'rajesh.p@gmail.com', role: 'temple_manager', status: 'pending', joinedDate: '2026-04-11', phone: '+919876543225' },
  { id: 'u017', name: 'Kavita Singh', email: 'kavita.s@gmail.com', role: 'devotee', status: 'active', joinedDate: '2026-03-05', phone: '+919876543226' },
  { id: 'u018', name: 'Pandit Hari Om Mishra', email: 'hariom.m@gmail.com', role: 'priest', status: 'active', joinedDate: '2025-04-18', phone: '+919876543227' },
  { id: 'u019', name: 'Nisha Gupta', email: 'nisha.gupta@gmail.com', role: 'devotee', status: 'active', joinedDate: '2026-04-01', phone: '+919876543228' },
  { id: 'u020', name: 'Amit Verma', email: 'amit.verma@gmail.com', role: 'store_owner', status: 'active', joinedDate: '2025-10-10', phone: '+919876543229' },
  { id: 'u021', name: 'Sita Rani Devi', email: 'sita.rani@gmail.com', role: 'devotee', status: 'active', joinedDate: '2026-04-08', phone: '+919876543230' },
  { id: 'u022', name: 'Karan Malhotra', email: 'karan.m@gmail.com', role: 'astrologer', status: 'pending', joinedDate: '2026-04-15', phone: '+919876543231' },
  { id: 'u023', name: 'Pooja Rawat', email: 'pooja.rawat@gmail.com', role: 'wellness_instructor', status: 'pending', joinedDate: '2026-04-12', phone: '+919876543232' },
  { id: 'u024', name: 'Dinesh Chaudhary', email: 'dinesh.c@gmail.com', role: 'gaushala_manager', status: 'active', joinedDate: '2025-09-01', phone: '+919876543233' },
  { id: 'u025', name: 'Lakshmi Iyer', email: 'lakshmi.i@gmail.com', role: 'temple_manager', status: 'active', joinedDate: '2025-07-22', phone: '+919876543234' },
];

const roleLabels: Record<string, string> = {
  devotee: 'Devotee',
  priest: 'Pandit',
  store_owner: 'Store Owner',
  astrologer: 'Astrologer',
  wellness_instructor: 'Wellness',
  gaushala_manager: 'Gaushala',
  temple_manager: 'Temple Mgr',
};

const roleBadgeColors: Record<string, string> = {
  devotee: 'bg-blue-50 text-blue-700',
  priest: 'bg-saffron-50 text-saffron-700',
  store_owner: 'bg-green-50 text-green-700',
  astrologer: 'bg-purple-50 text-purple-700',
  wellness_instructor: 'bg-teal-50 text-teal-700',
  gaushala_manager: 'bg-amber-50 text-amber-700',
  temple_manager: 'bg-red-50 text-red-700',
};

const statusBadge: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  blocked: 'bg-red-50 text-red-700',
};

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    await new Promise((r) => setTimeout(r, 600));
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'active' as UserStatus } : u));
    setActionLoading(null);
  };

  const handleToggleBlock = async (userId: string, currentStatus: UserStatus) => {
    setActionLoading(userId + '-block');
    await new Promise((r) => setTimeout(r, 600));
    setUsers((prev) => prev.map((u) =>
      u.id === userId
        ? { ...u, status: (currentStatus === 'blocked' ? 'active' : 'blocked') as UserStatus }
        : u
    ));
    setActionLoading(null);
  };

  const handleDelete = async (userId: string) => {
    setDeleteConfirm(null);
    setActionMenuOpen(null);
    setActionLoading(userId + '-delete');
    await new Promise((r) => setTimeout(r, 400));
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-surface-800">User Management</h1>
        <p className="text-sm text-surface-500 mt-0.5">Manage all platform users across roles</p>
      </div>

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
                          <p className="text-xs text-surface-500 mb-3">This action cannot be undone. The user "{user.name}" will be permanently removed.</p>
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
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users
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
      </div>
    </div>
  );
}
