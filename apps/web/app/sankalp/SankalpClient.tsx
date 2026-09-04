'use client';

import { useMemo, useState } from 'react';
import { buildSankalp, type Gotra, type SankalpIntent } from '../../lib/sankalp';
import { buttonClass } from '../../components/ui/button-recipe';

interface Props {
  gotras: Gotra[];
  intents: SankalpIntent[];
  nakshatraNames: string[];
  rashiOptions: { value: string; label: string }[];
}

export function SankalpClient({ gotras, intents, nakshatraNames, rashiOptions }: Props) {
  const [yajamana, setYajamana] = useState('');
  const [gotraSlug, setGotraSlug] = useState(gotras[0]?.slug ?? 'kashyap');
  const [nakshatraName, setNakshatraName] = useState('');
  const [rashiName, setRashiName] = useState('');
  const [city, setCity] = useState('');
  const [intentSlug, setIntentSlug] = useState(intents[0]?.slug ?? 'health');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<'sans' | 'iast' | 'eng' | null>(null);

  const output = useMemo(() => {
    if (!yajamana || !city) return null;
    return buildSankalp({
      yajamana, gotraSlug, nakshatraName, rashiName, city,
      intentSlug, date: new Date(),
    });
  }, [yajamana, gotraSlug, nakshatraName, rashiName, city, intentSlug]);

  const intent = intents.find((i) => i.slug === intentSlug);

  function handleCopy(text: string, kind: 'sans' | 'iast' | 'eng') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-900">Your full name <span className="text-red-500">*</span></span>
          <input
            type="text" required value={yajamana}
            onChange={(e) => setYajamana(e.target.value)}
            placeholder="e.g. Rakesh Sharma"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          />
          <span className="mt-1 block text-xs text-gray-500">Use the name your family priest would use.</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-900">Gotra <span className="text-red-500">*</span></span>
          <select
            value={gotraSlug} onChange={(e) => setGotraSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          >
            {gotras.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name} ({g.rishi})</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-900">City of residence <span className="text-red-500">*</span></span>
          <input
            type="text" required value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Pune"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-900">Nakshatra (optional)</span>
          <select
            value={nakshatraName} onChange={(e) => setNakshatraName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          >
            <option value="">— skip —</option>
            {nakshatraNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-900">Rashi (optional)</span>
          <select
            value={rashiName} onChange={(e) => setRashiName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          >
            <option value="">— skip —</option>
            {rashiOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-900">Intent <span className="text-red-500">*</span></span>
          <select
            value={intentSlug} onChange={(e) => setIntentSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          >
            {intents.map((i) => <option key={i.slug} value={i.slug}>{i.label}</option>)}
          </select>
        </label>

        <button
          type="submit"
          className={buttonClass('primary', 'md', 'sm:col-span-2 shadow')}
        >
          Generate Sankalp
        </button>
      </form>

      {submitted && output && (
        <div className="mt-8 space-y-5">
          <div className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-saffron-900">Sanskrit (recite this aloud)</h3>
              <button
                onClick={() => handleCopy(output.sanskritFull, 'sans')}
                className="text-xs font-medium text-saffron-700 hover:underline"
              >{copied === 'sans' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <pre className="whitespace-pre-wrap font-serif text-lg leading-loose text-gray-900">{output.sanskritFull}</pre>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Transliteration (IAST)</h3>
              <button
                onClick={() => handleCopy(output.iastFull, 'iast')}
                className="text-xs font-medium text-gray-700 hover:underline"
              >{copied === 'iast' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">{output.iastFull}</pre>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-900">English meaning</h3>
              <button
                onClick={() => handleCopy(output.englishFull, 'eng')}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >{copied === 'eng' ? '✓ Copied' : 'Copy'}</button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{output.englishFull}</pre>
          </div>

          {intent && intent.recommendedPujas.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
              <h3 className="text-sm font-semibold text-indigo-900">Recommended pujas for this intent</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-indigo-900">
                {intent.recommendedPujas.map((p) => <li key={p}>{p}</li>)}
              </ul>
              <a
                href="/pujas"
                className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:underline"
              >Book through Darshya →</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
