'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
 ArrowLeft,
 Star,
 IndianRupee,
 Calendar,
 Phone,
 Mail,
 MapPin,
 Shield,
 UserCheck,
 UserX,
 Ban,
 Trash2,
 KeyRound,
 Clock,
 CheckCircle2,
 XCircle,
 Package,
 ShoppingCart,
 Flame,
 BookOpen,
 Activity,
} from 'lucide-react';

// ── Mock user data keyed by ID ────────────────────────────────────────────────

interface UserProfile {
 id: string;
 name: string;
 email: string;
 phone: string;
 role: string;
 status: 'active' | 'pending' | 'blocked';
 joinedDate: string;
 city: string;
 state: string;
 avatarInitial: string;
 // Role-specific
 specialties?: string[];
 experience?: string;
 rating?: number;
 totalPujas?: number;
 totalEarnings?: number;
 storeName?: string;
 productsCount?: number;
 ordersCount?: number;
 storeRevenue?: number;
 consultations?: number;
 sessionsCount?: number;
 cowsManaged?: number;
 templeName?: string;
 darshanStreams?: number;
}

const usersDb: Record<string, UserProfile> = {
 u001: { id: 'u001', name: 'Arjun Sharma', email: 'arjun.sharma@gmail.com', phone: '+919876543210', role: 'devotee', status: 'active', joinedDate: '2025-11-12', city: 'Delhi', state: 'Delhi', avatarInitial: 'A' },
 u002: { id: 'u002', name: 'Pandit Ramesh Sharma', email: 'ramesh.sharma@gmail.com', phone: '+919876543211', role: 'priest', status: 'active', joinedDate: '2025-10-05', city: 'Varanasi', state: 'Uttar Pradesh', avatarInitial: 'R', specialties: ['Satyanarayan Puja', 'Griha Pravesh', 'Navgraha Shanti', 'Rudrabhishek'], experience: '18 years', rating: 4.8, totalPujas: 342, totalEarnings: 485000 },
 u003: { id: 'u003', name: 'Vikram Patel', email: 'vikram.patel@gmail.com', phone: '+919876543212', role: 'store_owner', status: 'active', joinedDate: '2025-09-20', city: 'Ahmedabad', state: 'Gujarat', avatarInitial: 'V', storeName: 'Shri Ganesh Puja Store', productsCount: 87, ordersCount: 1234, storeRevenue: 892000 },
 u004: { id: 'u004', name: 'Jyotishi Suresh Kumar', email: 'suresh.k@gmail.com', phone: '+919876543213', role: 'astrologer', status: 'pending', joinedDate: '2026-04-10', city: 'Jaipur', state: 'Rajasthan', avatarInitial: 'S', consultations: 0, rating: 0, totalEarnings: 0 },
 u005: { id: 'u005', name: 'Ananya Devi', email: 'ananya.devi@gmail.com', phone: '+919876543214', role: 'wellness_instructor', status: 'active', joinedDate: '2025-12-01', city: 'Rishikesh', state: 'Uttarakhand', avatarInitial: 'A', sessionsCount: 156, rating: 4.9, totalEarnings: 234000, specialties: ['Hatha Yoga', 'Pranayama', 'Meditation', 'Vipassana'] },
 u006: { id: 'u006', name: 'Govind Prasad', email: 'govind.prasad@gmail.com', phone: '+919876543215', role: 'gaushala_manager', status: 'pending', joinedDate: '2026-03-22', city: 'Mathura', state: 'Uttar Pradesh', avatarInitial: 'G', cowsManaged: 120 },
 u007: { id: 'u007', name: 'Swami Dayananda', email: 'swami.d@gmail.com', phone: '+919876543216', role: 'temple_manager', status: 'active', joinedDate: '2025-08-15', city: 'Haridwar', state: 'Uttarakhand', avatarInitial: 'S', templeName: 'Shri Mahadev Mandir', darshanStreams: 2, totalEarnings: 650000 },
 u009: { id: 'u009', name: 'Ravi Tiwari', email: 'ravi.tiwari@gmail.com', phone: '+919876543218', role: 'priest', status: 'pending', joinedDate: '2026-04-14', city: 'Prayagraj', state: 'Uttar Pradesh', avatarInitial: 'R', specialties: ['Kaal Sarp Dosh', 'Mangal Dosh'], experience: '8 years', rating: 0, totalPujas: 0, totalEarnings: 0 },
 u012: { id: 'u012', name: 'Rakesh Tiwari', email: 'rakesh.t@gmail.com', phone: '+919876543221', role: 'astrologer', status: 'active', joinedDate: '2025-07-11', city: 'Pune', state: 'Maharashtra', avatarInitial: 'R', consultations: 487, rating: 4.7, totalEarnings: 312000 },
};

const roleLabels: Record<string, string> = {
 devotee: 'Devotee',
 priest: 'Pandit',
 store_owner: 'Store Owner',
 astrologer: 'Astrologer',
 wellness_instructor: 'Wellness Instructor',
 gaushala_manager: 'Gaushala Manager',
 temple_manager: 'Temple Manager',
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

const statusColors: Record<string, string> = {
 active: 'bg-green-50 text-green-700',
 pending: 'bg-amber-50 text-amber-700',
 blocked: 'bg-red-50 text-red-700',
};

const activityLog = [
 { action: 'Profile updated', time: '2 hours ago', icon: Activity },
 { action: 'Logged in from Delhi', time: '5 hours ago', icon: Shield },
 { action: 'Completed a booking', time: '1 day ago', icon: CheckCircle2 },
 { action: 'Changed password', time: '3 days ago', icon: KeyRound },
 { action: 'Account created', time: '6 months ago', icon: Calendar },
];

function AdminUserDetailInner() {
 const sp = useSearchParams();
 const userId = sp.get('id') ?? '';
 const user = usersDb[userId];
 const [deleteConfirm, setDeleteConfirm] = useState(false);

 if (!user) {
 return (
 <div className="space-y-6">
 <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700">
 <ArrowLeft className="w-4 h-4" /> Back to Users
 </Link>
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
 <p className="text-surface-500">User not found. This may be a demo limitation.</p>
 <Link href="/admin/users" className="text-sm text-saffron-600 font-medium mt-2 inline-block">
 Return to user list
 </Link>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Back link */}
 <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:text-saffron-700">
 <ArrowLeft className="w-4 h-4" /> Back to Users
 </Link>

 {/* User header */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
 <div className="flex flex-col sm:flex-row items-start gap-5">
 <div className="w-16 h-16 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
 <span className="text-xl font-bold text-saffron-700">{user.avatarInitial}</span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h1 className="text-lg font-semibold text-surface-800">{user.name}</h1>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[user.role] || ''}`}>
 {roleLabels[user.role] || user.role}
 </span>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[user.status] || ''}`}>
 {user.status}
 </span>
 </div>
 <div className="flex flex-wrap gap-4 text-sm text-surface-500 mt-2">
 <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
 <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</span>
 <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{user.city}, {user.state}</span>
 <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {new Date(user.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
 </div>
 </div>

 {/* Actions */}
 <div className="flex flex-wrap gap-2 shrink-0">
 {user.status === 'pending' && (
 <>
 <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors">
 <UserCheck className="w-3.5 h-3.5" /> Approve
 </button>
 <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
 <XCircle className="w-3.5 h-3.5" /> Reject
 </button>
 </>
 )}
 <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-100 text-surface-700 text-xs font-medium rounded-lg hover:bg-surface-200 transition-colors">
 <Ban className="w-3.5 h-3.5" /> {user.status === 'blocked' ? 'Unblock' : 'Block'}
 </button>
 <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-100 text-surface-700 text-xs font-medium rounded-lg hover:bg-surface-200 transition-colors">
 <KeyRound className="w-3.5 h-3.5" /> Reset Password
 </button>
 <button
 onClick={() => setDeleteConfirm(true)}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
 >
 <Trash2 className="w-3.5 h-3.5" /> Delete
 </button>
 </div>
 </div>

 {/* Delete confirmation */}
 {deleteConfirm && (
 <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
 <p className="text-sm text-red-800 font-medium mb-2">Permanently delete {user.name}?</p>
 <p className="text-xs text-red-600 mb-3">This will remove all associated data including bookings, reviews, and payouts.</p>
 <div className="flex gap-2">
 <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1.5 text-xs font-medium text-surface-600 bg-white border border-surface-200 rounded-md hover:bg-surface-50 transition-colors">Cancel</button>
 <button className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">Confirm Delete</button>
 </div>
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Role-specific data */}
 <div className="lg:col-span-2 space-y-6">
 {/* Pandit stats */}
 {user.role === 'priest' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Pandit Profile</h2>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Flame className="w-5 h-5 text-saffron-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.totalPujas || 0}</p>
 <p className="text-xs text-surface-500">Total Pujas</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.rating || 'N/A'}</p>
 <p className="text-xs text-surface-500">Rating</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.experience || 'N/A'}</p>
 <p className="text-xs text-surface-500">Experience</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.totalEarnings || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Total Earnings</p>
 </div>
 </div>
 {user.specialties && user.specialties.length > 0 && (
 <div>
 <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">Specialties</p>
 <div className="flex flex-wrap gap-2">
 {user.specialties.map((s) => (
 <span key={s} className="px-2.5 py-1 bg-saffron-50 text-saffron-700 text-xs font-medium rounded-full">{s}</span>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Store Owner stats */}
 {user.role === 'store_owner' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Store Profile</h2>
 {user.storeName && <p className="text-sm text-surface-600 mb-4">Store: <span className="font-medium text-surface-800">{user.storeName}</span></p>}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Package className="w-5 h-5 text-blue-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.productsCount || 0}</p>
 <p className="text-xs text-surface-500">Products</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <ShoppingCart className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{(user.ordersCount || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Orders</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-saffron-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.storeRevenue || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Revenue</p>
 </div>
 </div>
 </div>
 )}

 {/* Astrologer stats */}
 {user.role === 'astrologer' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Astrologer Profile</h2>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <BookOpen className="w-5 h-5 text-purple-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.consultations || 0}</p>
 <p className="text-xs text-surface-500">Consultations</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.rating || 'N/A'}</p>
 <p className="text-xs text-surface-500">Rating</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.totalEarnings || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Earnings</p>
 </div>
 </div>
 </div>
 )}

 {/* Wellness Instructor stats */}
 {user.role === 'wellness_instructor' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Wellness Instructor Profile</h2>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Activity className="w-5 h-5 text-teal-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.sessionsCount || 0}</p>
 <p className="text-xs text-surface-500">Sessions</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">{user.rating || 'N/A'}</p>
 <p className="text-xs text-surface-500">Rating</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.totalEarnings || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Earnings</p>
 </div>
 </div>
 {user.specialties && user.specialties.length > 0 && (
 <div>
 <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">Specialties</p>
 <div className="flex flex-wrap gap-2">
 {user.specialties.map((s) => (
 <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full">{s}</span>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* Gaushala Manager stats */}
 {user.role === 'gaushala_manager' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Gaushala Manager Profile</h2>
 <div className="grid grid-cols-2 gap-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <span className="text-2xl mb-1 block"></span>
 <p className="text-lg font-bold text-surface-800">{user.cowsManaged || 0}</p>
 <p className="text-xs text-surface-500">Cows Managed</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.totalEarnings || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Donations Received</p>
 </div>
 </div>
 </div>
 )}

 {/* Temple Manager stats */}
 {user.role === 'temple_manager' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Temple Manager Profile</h2>
 {user.templeName && <p className="text-sm text-surface-600 mb-4">Temple: <span className="font-medium text-surface-800">{user.templeName}</span></p>}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <span className="text-2xl mb-1 block"></span>
 <p className="text-lg font-bold text-surface-800">{user.darshanStreams || 0}</p>
 <p className="text-xs text-surface-500">Darshan Streams</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. {(user.totalEarnings || 0).toLocaleString('en-IN')}</p>
 <p className="text-xs text-surface-500">Total Revenue</p>
 </div>
 </div>
 </div>
 )}

 {/* Devotee info */}
 {user.role === 'devotee' && (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
 <h2 className="text-sm font-semibold text-surface-800 mb-4">Devotee Profile</h2>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Flame className="w-5 h-5 text-saffron-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">12</p>
 <p className="text-xs text-surface-500">Bookings</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Rs. 24,500</p>
 <p className="text-xs text-surface-500">Total Spent</p>
 </div>
 <div className="text-center p-3 bg-surface-50 rounded-lg">
 <Shield className="w-5 h-5 text-blue-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-surface-800">Bhakti Pass</p>
 <p className="text-xs text-surface-500">Subscription</p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Activity log */}
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
 <div className="px-5 py-4 border-b border-[var(--color-border)]">
 <h2 className="text-sm font-semibold text-surface-800">Activity Log</h2>
 </div>
 <div className="p-5 space-y-4">
 {activityLog.map((entry, i) => {
 const Icon = entry.icon;
 return (
 <div key={i} className="flex items-start gap-3">
 <div className="w-8 h-8 bg-surface-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
 <Icon className="w-4 h-4 text-surface-400" />
 </div>
 <div>
 <p className="text-sm text-surface-800">{entry.action}</p>
 <p className="text-xs text-surface-400">{entry.time}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
}

export default function AdminUserDetailPage() {
 return (
 <Suspense fallback={<div className="p-8 text-sm text-surface-500">Loading…</div>}>
 <AdminUserDetailInner />
 </Suspense>
 );
}
