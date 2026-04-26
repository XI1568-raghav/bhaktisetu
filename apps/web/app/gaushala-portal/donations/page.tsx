'use client';

import { useState } from 'react';
import { Search, Download, Filter } from 'lucide-react';

const donations = [
 { id: 'D001', donor: 'Ramesh Sharma', amount: 5100, type: 'Gau Seva', date: '2026-04-24', status: 'Received', receipt: true },
 { id: 'D002', donor: 'Priya Agarwal', amount: 2500, type: 'Feed Sponsor', date: '2026-04-24', status: 'Received', receipt: true },
 { id: 'D003', donor: 'Vijay Kumar', amount: 11000, type: 'Medical Fund', date: '2026-04-23', status: 'Received', receipt: true },
 { id: 'D004', donor: 'Sunita Devi', amount: 1100, type: 'Gau Seva', date: '2026-04-23', status: 'Pending', receipt: false },
 { id: 'D005', donor: 'Ankit Mehta', amount: 21000, type: 'Adoption', date: '2026-04-22', status: 'Received', receipt: true },
 { id: 'D006', donor: 'Kavita Singh', amount: 5001, type: 'Gau Seva', date: '2026-04-21', status: 'Received', receipt: true },
 { id: 'D007', donor: 'Deepak Joshi', amount: 3100, type: 'Feed Sponsor', date: '2026-04-20', status: 'Failed', receipt: false },
 { id: 'D008', donor: 'Meera Patel', amount: 7500, type: 'Medical Fund', date: '2026-04-19', status: 'Received', receipt: true },
];

const campaigns = [
 { name: 'Gau Seva Monthly', raised: 142000, goal: 200000, donors: 284 },
 { name: 'Medical Emergency Fund', raised: 87500, goal: 100000, donors: 93 },
 { name: 'Cow Feed Drive', raised: 34200, goal: 50000, donors: 147 },
];

const statusStyles: Record<string, string> = {
 Received: 'bg-green-100 text-green-700',
 Pending: 'bg-yellow-100 text-yellow-700',
 Failed: 'bg-red-100 text-red-700',
};

export default function DonationsPage() {
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState('All');

 const filtered = donations.filter((d) => {
 const matchSearch =
 d.donor.toLowerCase().includes(search.toLowerCase()) ||
 d.type.toLowerCase().includes(search.toLowerCase());
 const matchStatus = statusFilter === 'All' || d.status === statusFilter;
 return matchSearch && matchStatus;
 });

 const total = donations.reduce((s, d) => s + (d.status === 'Received' ? d.amount : 0), 0);

 return (
 <div className="p-6 lg:p-8 space-y-8">
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-4">
 <div>
 <h1 className="text-2xl font-bold text-amber-900">Donations</h1>
 <p className="text-amber-700 text-sm mt-1">
 Total received: ₹{total.toLocaleString('en-IN')} this month
 </p>
 </div>
 <button
 onClick={() => {
 const header = 'ID,Donor,Amount,Type,Date,Status\n';
 const rows = donations.map((d) =>
 `${d.id},"${d.donor}",₹${d.amount},${d.type},${d.date},${d.status}`
 ).join('\n');
 const blob = new Blob([header + rows], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = 'donations.csv';
 a.click();
 URL.revokeObjectURL(url);
 }}
 className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 transition-colors"
 >
 <Download className="w-4 h-4" />
 Export CSV
 </button>
 </div>

 {/* Campaign Progress */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {campaigns.map((c) => {
 const pct = Math.round((c.raised / c.goal) * 100);
 return (
 <div key={c.name} className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
 <h3 className="font-semibold text-amber-900 text-sm mb-3">{c.name}</h3>
 <div className="flex justify-between text-xs text-gray-500 mb-1.5">
 <span>₹{(c.raised / 1000).toFixed(1)}K raised</span>
 <span className="font-medium text-amber-700">{pct}%</span>
 </div>
 <div className="w-full bg-amber-100 rounded-full h-2 mb-1.5">
 <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
 </div>
 <p className="text-xs text-gray-400">
 Goal: ₹{(c.goal / 1000).toFixed(0)}K · {c.donors} donors
 </p>
 </div>
 );
 })}
 </div>

 {/* Donations Table */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
 {/* Table Toolbar */}
 <div className="px-6 py-4 border-b border-amber-50 flex flex-wrap items-center gap-3">
 <div className="relative flex-1 min-w-[200px] max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search donor or type..."
 className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
 />
 </div>
 {['All', 'Received', 'Pending', 'Failed'].map((s) => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
 statusFilter === s
 ? 'bg-amber-700 text-white'
 : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
 }`}
 >
 {s}
 </button>
 ))}
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-amber-50">
 <tr>
 {['ID', 'Donor', 'Amount', 'Type', 'Date', 'Status', 'Receipt'].map((h) => (
 <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider">
 {h}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-amber-50">
 {filtered.map((d) => (
 <tr key={d.id} className="hover:bg-amber-50/60 transition-colors">
 <td className="px-5 py-3 font-mono text-xs text-gray-400">{d.id}</td>
 <td className="px-5 py-3 font-medium text-gray-800">{d.donor}</td>
 <td className="px-5 py-3 font-semibold text-amber-700">
 ₹{d.amount.toLocaleString('en-IN')}
 </td>
 <td className="px-5 py-3 text-gray-600">{d.type}</td>
 <td className="px-5 py-3 text-gray-500">{d.date}</td>
 <td className="px-5 py-3">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[d.status] ?? ''}`}>
 {d.status}
 </span>
 </td>
 <td className="px-5 py-3">
 {d.receipt
 ? <button className="text-amber-600 hover:text-amber-800 text-xs font-medium">Download</button>
 : <span className="text-gray-300 text-xs">—</span>
 }
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr>
 <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
 No donations found.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
