'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { userFacingMessage, UserFacingError, serverErrorText } from '../../lib/friendly-error';

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

interface ProgramDraft {
  name: string;
  durationMonths: number;
  modeOfStudy: 'residential' | 'online' | 'hybrid';
  ageMin: number;
  ageMax: number;
  description: string;
  feeAnnualInr: string;
}

const emptyProgram = (): ProgramDraft => ({
  name: '', durationMonths: 12, modeOfStudy: 'residential',
  ageMin: 8, ageMax: 18, description: '', feeAnnualInr: '',
});

export default function BecomeGurukulClient() {
  const { isAuthenticated, session } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', slug: '', description: '',
    city: '', state: '', country: 'India',
    tradition: 'Advaita',
    websiteUrl: '', contactEmail: '', contactPhone: '',
    isResidential: true, isOnline: false, acceptsMinors: true,
  });
  const [programs, setPrograms] = useState<ProgramDraft[]>([emptyProgram()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateProgram(idx: number, patch: Partial<ProgramDraft>) {
    setPrograms((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isAuthenticated || !session?.accessToken) {
      setError('Please sign in to register a gurukul.');
      return;
    }
    if (!form.name || !form.slug || !form.description || !form.city || !form.state || !form.contactEmail) {
      setError('Please fill all required fields.');
      return;
    }
    if (programs.length === 0) {
      setError('Add at least one program.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        websiteUrl: form.websiteUrl || undefined,
        contactPhone: form.contactPhone || undefined,
        programs: programs.map((p) => ({
          name: p.name,
          durationMonths: Number(p.durationMonths),
          modeOfStudy: p.modeOfStudy,
          ageMin: Number(p.ageMin),
          ageMax: Number(p.ageMax),
          description: p.description,
          feeAnnualInr: p.feeAnnualInr ? Number(p.feeAnnualInr) : null,
        })),
      };
      const res = await fetch(`${apiBase()}/api/v1/gurukuls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new UserFacingError(serverErrorText(txt, 'Submission failed. Please try again.'), res.status);
      }
      router.push('/gurukul-portal');
    } catch (e) {
      setError(userFacingMessage(e, 'Submission failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className={`${H1.catalogue} mb-2`}>Register your gurukul</h1>
      <p className="text-sm text-surface-600 mb-6">List your gurukul to receive admission inquiries from seekers across India and the diaspora.</p>

      {!isAuthenticated && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          Please <Link href="/auth/login" className="text-saffron-700 font-semibold">sign in</Link> to register.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-surface-900">Basic details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-surface-700">Gurukul name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-semibold text-surface-700">URL slug *</label>
              <input required pattern="[a-z0-9-]+" placeholder="my-gurukul-varanasi" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-surface-700">Description *</label>
            <textarea required minLength={50} maxLength={4000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-surface-700">City *</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-semibold text-surface-700">State *</label>
              <input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-semibold text-surface-700">Country</label>
              <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-surface-700">Tradition</label>
            <select value={form.tradition} onChange={(e) => setForm({ ...form, tradition: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg">
              <option>Advaita</option><option>Vishishtadvaita</option><option>Dvaita</option>
              <option>Smarta</option><option>Shaiva</option><option>Shakta</option><option>Vaishnava</option>
            </select>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-surface-900">Contact</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-surface-700">Contact email *</label>
              <input required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-semibold text-surface-700">Phone</label>
              <input type="tel" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-surface-700">Website</label>
            <input type="url" placeholder="https://..." value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-surface-900">Mode</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isResidential} onChange={(e) => setForm({ ...form, isResidential: e.target.checked })} /> Residential</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isOnline} onChange={(e) => setForm({ ...form, isOnline: e.target.checked })} /> Online</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.acceptsMinors} onChange={(e) => setForm({ ...form, acceptsMinors: e.target.checked })} /> Accepts minors</label>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-surface-900">Programs</h2>
            <button type="button" onClick={() => setPrograms((a) => [...a, emptyProgram()])} className="inline-flex items-center gap-1 text-sm text-saffron-700 font-semibold">
              <Plus className="w-4 h-4" /> Add program
            </button>
          </div>
          {programs.map((p, idx) => (
            <div key={idx} className="border border-surface-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-surface-700">Program {idx + 1}</span>
                {programs.length > 1 && (
                  <button type="button" onClick={() => setPrograms((a) => a.filter((_, i) => i !== idx))} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700">Program name</label>
                  <input required value={p.name} onChange={(e) => updateProgram(idx, { name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700">Duration (months)</label>
                  <input required type="number" min={1} max={144} value={p.durationMonths} onChange={(e) => updateProgram(idx, { durationMonths: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700">Mode</label>
                  <select value={p.modeOfStudy} onChange={(e) => updateProgram(idx, { modeOfStudy: e.target.value as ProgramDraft['modeOfStudy'] })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg">
                    <option value="residential">Residential</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700">Annual fee (INR, optional)</label>
                  <input type="number" min={0} value={p.feeAnnualInr} onChange={(e) => updateProgram(idx, { feeAnnualInr: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700">Age min</label>
                  <input required type="number" min={3} max={80} value={p.ageMin} onChange={(e) => updateProgram(idx, { ageMin: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-700">Age max</label>
                  <input required type="number" min={3} max={80} value={p.ageMax} onChange={(e) => updateProgram(idx, { ageMax: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-700">Description</label>
                <textarea required minLength={20} maxLength={2000} rows={3} value={p.description} onChange={(e) => updateProgram(idx, { description: e.target.value })} className="w-full mt-1 px-3 py-2 border border-surface-200 rounded-lg" />
              </div>
            </div>
          ))}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting || !isAuthenticated} className={buttonClass('primary', 'md', 'w-full')}>
          {submitting ? 'Registering...' : 'Register gurukul'}
        </button>
      </form>
    </main>
  );
}
