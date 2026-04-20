'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  XCircle,
  Eye,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  Filter,
} from 'lucide-react';

// ── Mock pending approvals ────────────────────────────────────────────────────

interface PendingApproval {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  state: string;
  submittedDate: string;
  bio: string;
  specialties?: string[];
  experience?: string;
}

const pendingApprovals: PendingApproval[] = [
  {
    id: 'u004',
    name: 'Jyotishi Suresh Kumar',
    email: 'suresh.k@gmail.com',
    phone: '+919876543213',
    role: 'astrologer',
    city: 'Jaipur',
    state: 'Rajasthan',
    submittedDate: '2026-04-10',
    bio: 'Vedic astrologer with 12 years of experience in Kundli analysis, match-making, and gemstone recommendations. Published author of "Jyotish Saral".',
    specialties: ['Kundli Analysis', 'Match Making', 'Gemstone Consultation'],
    experience: '12 years',
  },
  {
    id: 'u006',
    name: 'Govind Prasad',
    email: 'govind.prasad@gmail.com',
    phone: '+919876543215',
    role: 'gaushala_manager',
    city: 'Mathura',
    state: 'Uttar Pradesh',
    submittedDate: '2026-03-22',
    bio: 'Managing Shri Nandgaon Gaushala for 8 years. Currently caring for 120+ cows. Active in Go Seva awareness programs.',
  },
  {
    id: 'u009',
    name: 'Ravi Tiwari',
    email: 'ravi.tiwari@gmail.com',
    phone: '+919876543218',
    role: 'priest',
    city: 'Prayagraj',
    state: 'Uttar Pradesh',
    submittedDate: '2026-04-14',
    bio: 'Experienced pandit specializing in Kaal Sarp Dosh Nivaran and Mangal Dosh remedies. Performed rituals at Sangam ghat for 8 years.',
    specialties: ['Kaal Sarp Dosh', 'Mangal Dosh', 'Graha Shanti'],
    experience: '8 years',
  },
  {
    id: 'u010',
    name: 'Arun Mehta',
    email: 'arun.mehta@gmail.com',
    phone: '+919876543219',
    role: 'store_owner',
    city: 'Mumbai',
    state: 'Maharashtra',
    submittedDate: '2026-04-13',
    bio: 'Running Shri Lakshmi Puja Samagri for 15 years. Wholesale and retail puja items, brass murtis, and premium incense.',
  },
  {
    id: 'u016',
    name: 'Rajesh Pandey',
    email: 'rajesh.p@gmail.com',
    phone: '+919876543225',
    role: 'temple_manager',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    submittedDate: '2026-04-11',
    bio: 'Managing Shri Mahakaleshwar Trust activities. Want to bring live darshan streaming to the platform for devotees worldwide.',
  },
  {
    id: 'u022',
    name: 'Karan Malhotra',
    email: 'karan.m@gmail.com',
    phone: '+919876543231',
    role: 'astrologer',
    city: 'Chandigarh',
    state: 'Punjab',
    submittedDate: '2026-04-15',
    bio: 'Modern Vedic astrologer combining traditional jyotish with data-driven analysis. 500+ satisfied clients via social media.',
    specialties: ['Vedic Astrology', 'Prashna Kundli', 'Career Guidance'],
    experience: '5 years',
  },
  {
    id: 'u023',
    name: 'Pooja Rawat',
    email: 'pooja.rawat@gmail.com',
    phone: '+919876543232',
    role: 'wellness_instructor',
    city: 'Dehradun',
    state: 'Uttarakhand',
    submittedDate: '2026-04-12',
    bio: 'Certified yoga teacher from Sivananda Ashram. 200-hour TTC. Specializing in prenatal yoga and stress management through pranayama.',
    specialties: ['Prenatal Yoga', 'Pranayama', 'Stress Management'],
    experience: '6 years',
  },
];

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
  priest: 'bg-saffron-50 text-saffron-700 border-saffron-200',
  store_owner: 'bg-green-50 text-green-700 border-green-200',
  astrologer: 'bg-purple-50 text-purple-700 border-purple-200',
  wellness_instructor: 'bg-teal-50 text-teal-700 border-teal-200',
  gaushala_manager: 'bg-amber-50 text-amber-700 border-amber-200',
  temple_manager: 'bg-red-50 text-red-700 border-red-200',
};

export default function AdminApprovalsPage() {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [approvals, setApprovals] = useState(pendingApprovals);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = roleFilter === 'all'
    ? approvals
    : approvals.filter((a) => a.role === roleFilter);

  const handleApprove = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReject = (id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    setRejectModal(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Provider Approvals</h1>
          <p className="text-sm text-surface-500 mt-0.5">{approvals.length} pending approvals require review</p>
        </div>
      </div>

      {/* Filter */}
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

      {/* Approval cards */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <UserCheck className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-800 mb-1">All caught up!</h3>
          <p className="text-sm text-surface-500">No pending approvals{roleFilter !== 'all' ? ' for this role' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((approval) => (
            <div
              key={approval.id}
              className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Avatar + info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-saffron-700">
                      {approval.name.charAt(0)}
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
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{approval.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{approval.phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{approval.city}, {approval.state}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Submitted {new Date(approval.submittedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="text-sm text-surface-600 leading-relaxed mb-3">{approval.bio}</p>
                    {approval.specialties && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {approval.specialties.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-surface-100 text-surface-600 text-xs rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                    {approval.experience && (
                      <p className="text-xs text-surface-500">
                        <Star className="w-3 h-3 inline-block mr-1" />
                        {approval.experience} experience
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(approval.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => setRejectModal(approval.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <Link
                    href={`/admin/users/${approval.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-100 text-surface-600 text-xs font-medium rounded-lg hover:bg-surface-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                </div>
              </div>

              {/* Reject modal inline */}
              {rejectModal === approval.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Rejection reason for {approval.name}</p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide a reason for rejection (sent to the applicant)..."
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
                      onClick={() => handleReject(approval.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Confirm Rejection
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
