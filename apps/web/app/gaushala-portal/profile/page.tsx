'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { serverErrorMessage } from '../../../lib/friendly-error';
import AuthGuard from '../../../components/AuthGuard';
import { API_BASE_URL } from '../../../lib/api-config';
import { Mail, Building2, CheckCircle2, Loader2, AlertCircle, Upload, FileText } from 'lucide-react';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

type Profile = {
  id: string;
  gaushalaName: string;
  address: string | null;
  city: string | null;
  description: string | null;
  verified: boolean;
  approved: boolean;
};

export default function GaushalProfilePage() {
  return (
    <AuthGuard allowedRoles={['gaushala_manager', 'admin']}>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    gaushalaName: '',
    address: '',
    city: '',
    description: '',
  });
  const [kyc, setKyc] = useState<any>(null);

  const token = session?.accessToken;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/gaushala-portal/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const j = await r.json();
          if (j.profile) {
            const p: Profile = j.profile;
            setForm({
              gaushalaName: p.gaushalaName ?? '',
              address: p.address ?? '',
              city: p.city ?? '',
              description: p.description ?? '',
            });
          }
        }
        const kr = await fetch(`${API_BASE_URL}/provider-kyc`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (kr.ok) {
          const kj = await kr.json();
          setKyc(kj.kyc ?? null);
        }
      } catch {
        // graceful
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gaushalaName: form.gaushalaName,
          address: form.address || undefined,
          city: form.city || undefined,
          description: form.description || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        // RES-09: `Failed (500)` was the whole message on a server error.
        setError(serverErrorMessage(j, 'We could not save your profile. Please try again.'));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-[var(--color-text-muted)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <h1 className={H1.portal}>Gaushala Profile</h1>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-6">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-5">Manager Details</h2>
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'var(--color-primary-highlight)', color: 'var(--color-primary-active)' }}>
            {(user?.fullName ?? 'G').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)] text-lg">{user?.fullName ?? '—'}</p>
            <p className="text-[var(--color-primary)] text-sm">Gaushala Manager</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnly label="Full Name" value={user?.fullName} />
          <ReadOnly label="Email" value={user?.email} icon={Mail} />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">Gaushala Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Editable label="Gaushala Name *" value={form.gaushalaName} onChange={(v) => setForm((p) => ({ ...p, gaushalaName: v }))} />
          <Editable label="City" value={form.city} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
          <div className="sm:col-span-2">
            <Editable label="Address" value={form.address} onChange={(v) => setForm((p) => ({ ...p, address: v }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-[#fef2e8] border border-[#f59e54] text-[#943b19]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !form.gaushalaName.trim()}
            className={buttonClass('primary', 'md')}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-sm text-[#3f6b1f] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Profile updated
            </span>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-6">
        <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-5">Verification Documents</h2>
        {kyc ? (
          <div className="space-y-3">
            <DocRow label="PAN" value={kyc.panNumber} verified={!!kyc.panNumber} />
            <DocRow label="Aadhaar" value={kyc.aadhaarNumber ? `XXXX-XXXX-${String(kyc.aadhaarNumber).slice(-4)}` : null} verified={!!kyc.aadhaarNumber} />
            <DocRow label="Address Proof" value={kyc.addressProofUrl ? 'Uploaded' : null} verified={!!kyc.addressProofUrl} />
            <DocRow label="Selfie" value={kyc.selfieUrl ? 'Uploaded' : null} verified={!!kyc.selfieUrl} />
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Status: <span className={`font-medium ${kyc.verified ? 'text-[#3f6b1f]' : kyc.rejectionReason ? 'text-[#943b19]' : 'text-[var(--color-primary)]'}`}>
                {kyc.verified ? 'Verified' : kyc.rejectionReason ? 'Rejected' : 'Pending review'}
              </span></p>
              {kyc.rejectionReason && <p className="text-xs text-[#943b19] mt-1">{kyc.rejectionReason}</p>}
              <a href="/provider/kyc" className="inline-flex items-center gap-1.5 mt-3 text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">
                <Upload className="w-3.5 h-3.5" /> Manage KYC documents →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 mx-auto text-[var(--color-text-faint)] mb-3" />
            <p className="text-sm text-[var(--color-text-muted)] mb-3">No verification documents submitted yet.</p>
            <a href="/provider/kyc" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">
              <Upload className="w-4 h-4" /> Submit KYC documents →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnly({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2.5 p-3 bg-[var(--color-surface-offset)] rounded-lg border border-[var(--color-border)]">
        {Icon && <Icon className="w-4 h-4 text-[var(--color-primary)] shrink-0" />}
        <span className="text-sm text-[var(--color-text)]">{value ?? '—'}</span>
      </div>
    </div>
  );
}

function Editable({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
    </div>
  );
}

function DocRow({ label, value, verified }: { label: string; value: string | null; verified: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--color-surface-offset)] rounded-lg border border-[var(--color-border)]">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        <p className="text-xs text-[var(--color-text-faint)] mt-0.5">{value ?? 'Not submitted'}</p>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        verified ? 'bg-[#e7f0e0] text-[#3f6b1f]' : 'bg-[var(--color-surface)] text-[var(--color-text-faint)] border border-[var(--color-border)]'
      }`}>
        {verified ? 'Submitted' : 'Pending'}
      </span>
    </div>
  );
}
