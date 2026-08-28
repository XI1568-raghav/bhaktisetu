'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DateInput } from '../../../components/ui/DateInput';
import { H1 } from '../../../components/ui/heading-recipe';
import { useAuth } from '../../../lib/auth-context';
import { fetchWithTimeout } from '../../../lib/api-config';

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

/** Deliberately generous — see the note at the call site. */
const MUHURAT_TIMEOUT_MS = 45_000;

/**
 * Only reachable now when the API rejects a session we DID send (401/403).
 * A signed-out visitor never sees it: the endpoint is public. See `submit`.
 */
const LOGIN_HREF = `/auth/login?redirect=${encodeURIComponent('/weddings/muhurat')}`;

export default function MuhuratPage() {
  const { session } = useAuth();
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
  // PAR-14: an error that can only be cleared by signing in needs a door, not
  // just a sentence. Tracked separately so the alert can render the link.
  const [needsSignIn, setNeedsSignIn] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  /*
   * PAR-14, in two parts, both now landed.
   *
   * Part one (earlier): this handler used to POST with
   * `headers: {'content-type': ...}` and nothing else, against a route
   * registered behind `preHandler: [authenticateUser]`. Every web visitor got
   * 401 — signed in or not — and the catch below rendered the literal string
   * "Request failed: 401". The mobile client always sent the token, which is
   * why the same feature worked there.
   *
   * Part two (this change): the API-side half. POST /weddings/muhurat is now
   * PUBLIC and rate-limited per IP instead of authenticated
   * (apps/api/src/routes/weddings.ts) — the compute concern that motivated the
   * gate is a request-rate concern, and the gate was blocking the journey the
   * route exists for: /weddings/inquiry emails this page's URL to a brand-new
   * prospect who is by definition signed out. So the pre-flight sign-out gate
   * that used to live here is GONE. A visitor with no session submits the form
   * and gets dates.
   *
   * The bearer is still attached WHEN WE HAVE ONE, and the 401/403 branch
   * below is kept: both are the cheap side of the asymmetry. If an older API
   * is still deployed, or a future variant re-scopes this per-user, a signed-in
   * visitor keeps working and a rejected one still gets a door rather than a
   * status code. What is not kept is refusing to ask.
   */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsSignIn(false);

    const token = session?.accessToken;

    setLoading(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.brideNakshatra) delete body.brideNakshatra;
      if (!body.groomNakshatra) delete body.groomNakshatra;
      const res = await fetchWithTimeout(
        `${apiBase()}/weddings/muhurat`,
        {
          method: 'POST',
          // No `Authorization: Bearer undefined` for a signed-out visitor: an
          // empty/garbage bearer is worse than none, because middlewares/auth.ts
          // treats a present-but-unparseable Authorization header as an attempt
          // to authenticate rather than as anonymous traffic.
          headers: token
            ? { 'content-type': 'application/json', Authorization: `Bearer ${token}` }
            : { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          // fetchWithTimeout defaults to credentials:'include'. This call is
          // cross-origin (api.darshya.online) and the bare fetch it replaces
          // used the default 'same-origin', which sends nothing cross-origin.
          // Keeping that explicit: switching to 'include' would need the API
          // to answer Access-Control-Allow-Credentials or the browser blocks
          // the response outright.
          credentials: 'omit',
        },
        // The last bare fetch on an auth surface. Every other one got a budget
        // when the "infinite spinner, no error" P0 was traced to a promise that
        // never settles; this one was left alone because nobody had measured
        // how long the mhah-panchang Ayanamsa/dasha scan takes over a wide date
        // window, and a blind 15s cap could turn a slow success into a failure.
        // 45s does not need that measurement: it is three times the app's data
        // budget and still finite, so a half-open socket ends in a sentence the
        // user can act on instead of a spinner that never stops.
        MUHURAT_TIMEOUT_MS,
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setNeedsSignIn(true);
          setError('Your session has expired. Sign in again to compute your muhurat dates.');
          return;
        }
        const detail = await res.json().catch(() => ({} as Record<string, unknown>));
        const message =
          typeof (detail as { message?: unknown }).message === 'string'
            ? (detail as { message: string }).message
            : typeof (detail as { error?: unknown }).error === 'string'
              ? (detail as { error: string }).error
              : 'We could not compute your muhurat dates just now. Please try again.';
        setError(message);
        return;
      }
      const data: MuhuratResponse = await res.json();
      setResult(data);
    } catch {
      setError('We could not reach the muhurat service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-amber-50/40 py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className={H1.catalogue}>Find your muhurat</h1>
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
            <DateInput
              required
              value={form.brideDob}
              onChange={(v) => update('brideDob', v)}
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
            <DateInput
              required
              value={form.groomDob}
              onChange={(v) => update('groomDob', v)}
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
            <DateInput
              required
              value={form.fromDate}
              onChange={(v) => update('fromDate', v)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-stone-700">To</span>
            <DateInput
              required
              value={form.toDate}
              onChange={(v) => update('toDate', v)}
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
          <div
            role="alert"
            className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg"
          >
            {error}
            {needsSignIn && (
              <>
                {' '}
                <Link href={LOGIN_HREF} className="font-semibold underline underline-offset-2">
                  Sign in
                </Link>
              </>
            )}
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
