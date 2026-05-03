'use client';
export const runtime = 'edge';

import { useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { Mail, Phone, MapPin, Camera, Building2, CheckCircle2, Loader2 } from 'lucide-react';

export default function GaushalProfilePage() {
 const { user } = useAuth();
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);

 const handleSave = async () => {
 setSaving(true);
 setSaved(false);
 // Simulate save (demo mode — no live API)
 await new Promise((r) => setTimeout(r, 900));
 setSaving(false);
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 };

 return (
 <div className="p-6 lg:p-8 max-w-3xl space-y-6">
 <h1 className="text-2xl font-bold text-amber-900">Gaushala Profile</h1>

 {/* Manager Details */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
 <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
 Manager Details
 </h2>
 <div className="flex items-center gap-5 mb-6">
 <div className="relative shrink-0">
 <div className="w-16 h-16 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-2xl font-bold">
 {(user?.fullName ?? 'G').charAt(0).toUpperCase()}
 </div>
 <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-700 rounded-full flex items-center justify-center hover:bg-amber-800 transition-colors">
 <Camera className="w-3 h-3 text-white" />
 </button>
 </div>
 <div>
 <p className="font-semibold text-gray-900 text-lg">{user?.fullName}</p>
 <p className="text-amber-600 text-sm">Gaushala Manager</p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {[
 { label: 'Full Name', value: user?.fullName, icon: null },
 { label: 'Email', value: user?.email, icon: Mail },
 { label: 'Phone', value: '+91 98765 43210', icon: Phone },
 { label: 'Location', value: 'Vrindavan, UP', icon: MapPin},
 ].map(({ label, value, icon: Icon }) => (
 <div key={label} className="space-y-1.5">
 <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
 <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
 {Icon && <Icon className="w-4 h-4 text-amber-600 shrink-0" />}
 <span className="text-sm text-gray-700">{value ?? '—'}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Gaushala Info */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
 <div className="flex items-center gap-2 mb-5">
 <Building2 className="w-4 h-4 text-amber-600" />
 <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
 Gaushala Information
 </h2>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {[
 { label: 'Gaushala Name', value: 'Shri Kamdhenu Gaushala' },
 { label: 'Registration No.', value: 'GS-UP-2019-00234' },
 { label: 'Established', value: '2019' },
 { label: 'Capacity', value: '300 cows' },
 { label: 'District', value: 'Mathura, Uttar Pradesh' },
 { label: 'Address', value: 'NH-19, Mathura Road, Vrindavan, UP 281121' },
 ].map(({ label, value }) => (
 <div key={label} className="space-y-1.5">
 <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
 <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
 <span className="text-sm text-gray-700">{value}</span>
 </div>
 </div>
 ))}
 </div>

 <div className="mt-6 flex items-center gap-3">
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-5 py-2.5 bg-amber-800 text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {saving ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
 ) : saved ? (
 <><CheckCircle2 className="w-4 h-4" /> Saved!</>
 ) : (
 'Save Changes'
 )}
 </button>
 <button className="px-5 py-2.5 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors">
 Cancel
 </button>
 {saved && (
 <span className="text-sm text-green-600 flex items-center gap-1.5">
 <CheckCircle2 className="w-4 h-4" /> Profile updated successfully
 </span>
 )}
 </div>
 </div>

 {/* Documents */}
 <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
 <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
 Verification Documents
 </h2>
 <div className="space-y-3">
 {[
 { name: 'Gaushala Registration Certificate', status: 'Verified', date: '2019-03-15' },
 { name: 'Trust/NGO Registration (80G)', status: 'Verified', date: '2019-06-20' },
 { name: 'Bank Account Verification', status: 'Verified', date: '2020-01-10' },
 { name: 'Veterinary License', status: 'Pending', date: '—' },
 ].map((doc) => (
 <div key={doc.name} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
 <div>
 <p className="text-sm font-medium text-gray-800">{doc.name}</p>
 <p className="text-xs text-gray-400 mt-0.5">Submitted: {doc.date}</p>
 </div>
 <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
 doc.status === 'Verified'
 ? 'bg-green-100 text-green-700'
 : 'bg-yellow-100 text-yellow-700'
 }`}>
 {doc.status}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
