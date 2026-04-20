'use client';

import { useState } from 'react';
import {
  Save,
  IndianRupee,
  Crown,
  Settings,
  Bell,
  Shield,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Trash2,
} from 'lucide-react';

// ── Mock Settings Data ────────────────────────────────────────────────────────

interface CommissionRate {
  category: string;
  rate: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  active: boolean;
}

const initialCommissionRates: CommissionRate[] = [
  { category: 'Puja Bookings', rate: 25 },
  { category: 'Store Sales', rate: 15 },
  { category: 'Astrology Consultations', rate: 30 },
  { category: 'Wellness Classes', rate: 20 },
  { category: 'Gaushala Donations', rate: 10 },
  { category: 'Temple Chadhava', rate: 20 },
];

const initialPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'forever',
    features: ['Basic darshan access', 'Limited content', 'Standard booking'],
    active: true,
  },
  {
    id: 'bhakti_pass',
    name: 'Bhakti Pass',
    price: 199,
    interval: 'month',
    features: ['Ad-free darshan', 'Premium content', '10% booking discount', 'Priority support'],
    active: true,
  },
  {
    id: 'bhakti_pass_annual',
    name: 'Bhakti Pass Annual',
    price: 1999,
    interval: 'year',
    features: ['All Bhakti Pass benefits', '15% booking discount', 'Exclusive events', 'Free prasad delivery'],
    active: true,
  },
  {
    id: 'temple_trust',
    name: 'Temple Trust',
    price: 499,
    interval: 'month',
    features: ['Multiple temple management', 'Analytics dashboard', 'Priority listing', 'Dedicated support'],
    active: false,
  },
];

const initialAdmins = [
  { id: '1', name: 'Admin User', email: 'admin@demo.com', role: 'Super Admin', addedDate: '2025-01-01' },
  { id: '2', name: 'Rahul Verma', email: 'rahul.v@poojly.com', role: 'Admin', addedDate: '2025-06-15' },
  { id: '3', name: 'Meena Kapoor', email: 'meena.k@poojly.com', role: 'Moderator', addedDate: '2025-09-20' },
];

export default function AdminSettingsPage() {
  const [commissionRates, setCommissionRates] = useState(initialCommissionRates);
  const [plans, setPlans] = useState(initialPlans);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [autoApproveDevotees, setAutoApproveDevotees] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'commissions' | 'subscriptions' | 'platform' | 'admins'>('commissions');

  const handleRateChange = (index: number, newRate: number) => {
    setCommissionRates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, rate: newRate };
      return updated;
    });
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const togglePlan = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, active: !p.active } : p))
    );
    setSaved(false);
  };

  const tabs = [
    { id: 'commissions' as const, label: 'Commissions', icon: IndianRupee },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: Crown },
    { id: 'platform' as const, label: 'Platform', icon: Settings },
    { id: 'admins' as const, label: 'Admins', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Settings</h1>
          <p className="text-sm text-surface-500 mt-0.5">Configure platform settings, commissions, and subscriptions</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 transition-colors"
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--color-surface)] rounded-lg p-1 border border-[var(--color-border)] w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-saffron-600 text-white'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Commission rates */}
      {activeTab === 'commissions' && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-surface-800 mb-1">Commission Rates by Category</h2>
          <p className="text-xs text-surface-500 mb-5">Set the platform commission percentage for each service category.</p>
          <div className="space-y-4">
            {commissionRates.map((cr, i) => (
              <div key={cr.category} className="flex items-center gap-4">
                <label className="text-sm text-surface-700 w-52 shrink-0">{cr.category}</label>
                <div className="flex-1 max-w-xs">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={cr.rate}
                    onChange={(e) => handleRateChange(i, Number(e.target.value))}
                    className="w-full accent-saffron-600"
                  />
                </div>
                <div className="flex items-center gap-1 w-20">
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={cr.rate}
                    onChange={(e) => handleRateChange(i, Number(e.target.value))}
                    className="w-14 px-2 py-1.5 text-center bg-surface-50 border border-[var(--color-border)] rounded-md text-sm text-surface-800 focus:outline-none focus:ring-2 focus:ring-saffron-500/30"
                  />
                  <span className="text-sm text-surface-500">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription plans */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-[var(--color-surface)] rounded-xl border p-5 transition-colors ${
                plan.active ? 'border-[var(--color-border)]' : 'border-[var(--color-border)] opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-surface-800">{plan.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${plan.active ? 'bg-green-50 text-green-700' : 'bg-surface-100 text-surface-500'}`}>
                      {plan.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-surface-500 mt-0.5">
                    {plan.price === 0 ? 'Free forever' : `Rs. ${plan.price}/${plan.interval}`}
                  </p>
                </div>
                <button
                  onClick={() => togglePlan(plan.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    plan.active ? 'bg-green-500' : 'bg-surface-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      plan.active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {plan.features.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-50 text-surface-600 text-xs rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Platform settings */}
      {activeTab === 'platform' && (
        <div className="space-y-4">
          {/* Maintenance mode */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${maintenanceMode ? 'text-amber-500' : 'text-surface-400'}`} />
                  <h3 className="font-semibold text-surface-800">Maintenance Mode</h3>
                </div>
                <p className="text-xs text-surface-500 mt-1 ml-6">
                  When enabled, the platform shows a maintenance page to all non-admin users.
                </p>
              </div>
              <button
                onClick={() => { setMaintenanceMode(!maintenanceMode); setSaved(false); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  maintenanceMode ? 'bg-amber-500' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-blue-500" /> Notification Settings
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Email Notifications', desc: 'Send transactional emails (booking confirmations, payment receipts)', value: emailNotifications, set: setEmailNotifications },
                { label: 'SMS Notifications', desc: 'Send SMS alerts for critical events (OTP, booking reminders)', value: smsNotifications, set: setSmsNotifications },
                { label: 'Push Notifications', desc: 'Browser push notifications for admin alerts', value: pushNotifications, set: setPushNotifications },
              ].map((toggle) => (
                <div key={toggle.label} className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-800">{toggle.label}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{toggle.desc}</p>
                  </div>
                  <button
                    onClick={() => { toggle.set(!toggle.value); setSaved(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${
                      toggle.value ? 'bg-green-500' : 'bg-surface-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        toggle.value ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-approve devotees */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-surface-800">Auto-Approve Devotees</h3>
                </div>
                <p className="text-xs text-surface-500 mt-1 ml-6">
                  Automatically approve devotee signups without manual review. Provider roles still require approval.
                </p>
              </div>
              <button
                onClick={() => { setAutoApproveDevotees(!autoApproveDevotees); setSaved(false); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoApproveDevotees ? 'bg-green-500' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    autoApproveDevotees ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin management */}
      {activeTab === 'admins' && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-surface-800">Admin Accounts</h2>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-saffron-600 text-white text-xs font-medium rounded-lg hover:bg-saffron-700 transition-colors">
              <UserPlus className="w-3.5 h-3.5" /> Add Admin
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Added</th>
                  <th className="text-right py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {initialAdmins.map((admin, i) => (
                  <tr key={admin.id} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-saffron-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-saffron-700">{admin.name.charAt(0)}</span>
                        </div>
                        <span className="font-medium text-surface-800">{admin.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-surface-500">{admin.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === 'Super Admin' ? 'bg-red-50 text-red-700' : admin.role === 'Admin' ? 'bg-blue-50 text-blue-700' : 'bg-surface-100 text-surface-600'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-surface-500">
                      {new Date(admin.addedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {admin.role !== 'Super Admin' && (
                        <button className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
