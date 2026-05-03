'use client';
export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

interface Candidate {
  date: string;
  weekday: string;
  nakshatra: string;
  rashi: string;
  tithi: number;
  abhijitMuhurat: { from: string; to: string };
  score: number;
  reasons: string[];
  warnings: string[];
}

interface MuhuratResponse {
  bride: { nakshatra: string; rashi: string };
  groom: { nakshatra: string; rashi: string };
  mangalikFlag: { brideMangalik: boolean; groomMangalik: boolean };
  candidates: Candidate[];
}

function apiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/$/, '')}/api/v1`;
}

export default function MuhuratPage() {
  const [form, setForm] = useState({
    brideDob: '',
    brideTob: '06:30',
    brideNakshatra: '',
    groomDob: '',
    groomTob: '07:00',
    groomNakshatra: '',
    fromDate: '',
    toDate: '',
    location: 'Delhi',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MuhuratResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.brideNakshatra) delete body.brideNakshatra;
      if (!body.groomNakshatra) delete body.groomNakshatra;
      const res = await fetch(`${apiBase()}/weddings/muhurat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: MuhuratResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-amber-50/40 py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl text-amber-900">Find your muhurat</h1>
        <p className="text-stone-700 mt-2">
          We compute the most auspicious wedding dates from your nakshatras using classical Vedic
          rules (Brihat Samhita, Muhurta Chintamani).
        </p>

        <form
          onSubmit={submit}
          className="mt-6 bg-white rounded-xl p-6 border border-amber-100 grid gap-4 sm:grid-cols-2"
        >
          <fieldset className="sm:col-span-2">
            <legend className="font-serif text-lg text-amber-900">Bride</legend>
          </fieldset>
          <label className="block">
            <span className="text-sm text-stone-700">Date of birth</span>
            <input
              type="date"
              required
              value={form.brideDob}
              onChange={(e) => update('brideDob', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">Time of birth</span>
            <input
              type="time"
              required
              value={form.brideTob}
              onChange={(e) => update('brideTob', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-700">Nakshatra (optional, overrides DOB)</span>
            <select
              value={form.brideNakshatra}
              onChange={(e) => update('brideNakshatra', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            >
              <option value="">— compute from birth —</option>
              {NAKSHATRAS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="sm:col-span-2 mt-4">
            <legend className="font-serif text-lg text-amber-900">Groom</legend>
          </fieldset>
          <label className="block">
            <span className="text-sm text-stone-700">Date of birth</span>
            <input
              type="date"
              required
              value={form.groomDob}
              onChange={(e) => update('groomDob', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">Time of birth</span>
            <input
              type="time"
              required
              value={form.groomTob}
              onChange={(e) => update('groomTob', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-700">Nakshatra (optional)</span>
            <select
              value={form.groomNakshatra}
              onChange={(e) => update('groomNakshatra', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            >
              <option value="">— compute from birth —</option>
              {NAKSHATRAS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="sm:col-span-2 mt-4">
            <legend className="font-serif text-lg text-amber-900">Wedding window</legend>
          </fieldset>
          <label className="block">
            <span className="text-sm text-stone-700">From</span>
            <input
              type="date"
              required
              value={form.fromDate}
              onChange={(e) => update('fromDate', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">To</span>
            <input
              type="date"
              required
              value={form.toDate}
              onChange={(e) => update('toDate', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-stone-700">Location</span>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 p-2"
            />
          </label>

          <div className="sm:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-amber-700 text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Computing…' : 'Find auspicious dates'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <section className="mt-8">
            <div className="bg-white rounded-xl p-5 border border-amber-100">
              <p className="text-sm text-stone-700">
                Bride nakshatra: <strong>{result.bride.nakshatra}</strong> ({result.bride.rashi}) ·
                Groom nakshatra: <strong>{result.groom.nakshatra}</strong> ({result.groom.rashi})
              </p>
              {(result.mangalikFlag.brideMangalik || result.mangalikFlag.groomMangalik) && (
                <p className="text-sm text-amber-800 mt-2">
                  Mangalik flag detected — recommend a parihara puja before vivah. Talk to a
                  Darshya astrologer for the full dosha analysis.
                </p>
              )}
            </div>

            <h2 className="font-serif text-2xl text-amber-900 mt-6">Top 10 muhurats</h2>
            <ol className="mt-4 grid gap-4">
              {result.candidates.map((c) => (
                <li
                  key={c.date}
                  className="bg-white rounded-xl p-5 border border-amber-100 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xl font-serif text-amber-900">
                        {new Date(c.date + 'T00:00:00Z').toLocaleDateString('en-IN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-stone-700">
                        Nakshatra <strong>{c.nakshatra}</strong> · Rashi {c.rashi} · Tithi{' '}
                        {c.tithi}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-700">{c.score}/100</p>
                      <p className="text-xs text-stone-500">
                        Abhijit {c.abhijitMuhurat.from}–{c.abhijitMuhurat.to}
                      </p>
                    </div>
                  </div>
                  {c.reasons.length > 0 && (
                    <ul className="mt-3 list-disc list-inside text-sm text-stone-700">
                      {c.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {c.warnings.length > 0 && (
                    <ul className="mt-2 list-disc list-inside text-sm text-amber-700">
                      {c.warnings.map((w, i) => (
                        <li key={i}>⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-8 text-center">
              <Link
                href="/weddings/inquiry"
                className="px-6 py-3 rounded-lg bg-amber-700 text-white font-medium"
              >
                Book a wedding planner
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
