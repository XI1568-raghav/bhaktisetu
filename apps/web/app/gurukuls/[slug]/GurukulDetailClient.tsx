'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Globe, Phone, Mail, CheckCircle2, Home, Users } from 'lucide-react';

interface Program {
  id: string; name: string; durationMonths: number; modeOfStudy: string;
  ageMin: number; ageMax: number; description: string; feeAnnualInr: number | null;
}

interface GurukulDetail {
  id: string; slug: string; name: string; description: string;
  city: string; state: string; country: string;
  websiteUrl: string | null; contactEmail: string;
  contactVerified: boolean; contactPhone: string | null;
  tradition: string; isResidential: boolean; isOnline: boolean;
  acceptsMinors: boolean; isVerified: boolean;
  programs: Program[];
}

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

export default function GurukulDetailClient({ slug }: { slug: string }) {
  const [g, setG] = useState<GurukulDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/api/v1/gurukuls/${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'Not found' : `HTTP ${r.status}`)))
      .then(setG)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [slug]);

  if (error) return <main className="max-w-4xl mx-auto px-4 py-8"><p className="text-red-600">{error}</p></main>;
  if (!g) return <main className="max-w-4xl mx-auto px-4 py-8"><p className="text-surface-500">Loading...</p></main>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/gurukuls" className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to gurukuls
      </Link>
      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{g.tradition}</span>
          {g.isVerified && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-surface-900">{g.name}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-surface-500 flex-wrap">
          <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{g.city}, {g.state}</span>
          {g.isResidential && <span className="inline-flex items-center gap-1"><Home className="w-4 h-4" />Residential</span>}
          {g.isOnline && <span className="inline-flex items-center gap-1"><Globe className="w-4 h-4" />Online</span>}
          {g.acceptsMinors && <span className="inline-flex items-center gap-1"><Users className="w-4 h-4" />Minors welcome</span>}
        </div>
      </header>

      <p className="text-surface-700 leading-relaxed whitespace-pre-line">{g.description}</p>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Contact</h2>
        <div className="flex flex-col gap-1 text-sm text-surface-700">
          <a className="inline-flex items-center gap-2 hover:text-saffron-700" href={`mailto:${g.contactEmail}`}><Mail className="w-4 h-4" />{g.contactEmail}</a>
          {g.contactPhone && <a className="inline-flex items-center gap-2 hover:text-saffron-700" href={`tel:${g.contactPhone}`}><Phone className="w-4 h-4" />{g.contactPhone}</a>}
          {g.websiteUrl && <a className="inline-flex items-center gap-2 hover:text-saffron-700" href={g.websiteUrl} target="_blank" rel="noreferrer"><Globe className="w-4 h-4" />Website</a>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-surface-900 mb-3">Programs</h2>
        {g.programs.length === 0 && <p className="text-sm text-surface-500">No programs listed yet.</p>}
        <div className="space-y-3">
          {g.programs.map((p) => (
            <div key={p.id} className="p-4 bg-white border border-surface-200 rounded-xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-bold text-surface-900">{p.name}</h3>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {p.durationMonths} months - {p.modeOfStudy} - Age {p.ageMin}-{p.ageMax}
                    {p.feeAnnualInr ? ` - INR ${p.feeAnnualInr.toLocaleString('en-IN')}/yr` : ''}
                  </div>
                </div>
                <Link href={`/gurukuls/apply/${p.id}`} className="px-4 py-2 bg-saffron-600 text-white text-sm font-semibold rounded-lg hover:bg-saffron-700 shrink-0">
                  Apply
                </Link>
              </div>
              <p className="text-sm text-surface-600">{p.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
