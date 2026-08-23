'use client';

import { useMemo, useState } from 'react';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { buttonClass } from '../../components/ui/button-recipe';


// Viral feature: shareable shloka card generator (Day 31-60 plan).
// User types Devanagari + optional translit/meaning/source -> live preview
// of the /og/shloka edge route -> one-click download or share. Zero auth,
// zero backend writes. PostHog event fires on first download for funnel
// measurement. Each share carries ?utm_source=shloka-card so attribution
// can be measured cleanly.

const PRESETS = [
  {
    label: 'Shanti Mantra',
    text: 'ॐ सर्वे भवन्तु सुखिनः\nसर्वे सन्तु निरामयाः।',
    translit: 'Om sarve bhavantu sukhinaḥ\nsarve santu nirāmayāḥ.',
    meaning: 'May all be happy. May all be free from illness.',
    source: 'Brihadaranyaka Upanishad 1.4.14',
  },
  {
    label: 'Gita 2.47',
    text: 'कर्मण्येवाधिकारस्ते\nमा फलेषु कदाचन।',
    translit: 'Karmaṇy-evādhikāras te\nmā phaleṣu kadācana.',
    meaning: 'You have a right to action alone, never to its fruits.',
    source: 'Bhagavad Gita 2.47',
  },
  {
    label: 'Hanuman',
    text: 'मनोजवं मारुततुल्यवेगं\nजितेन्द्रियं बुद्धिमतां वरिष्ठम्।',
    translit: 'Manojavaṁ mārutatulyavegaṁ\njitendriyaṁ buddhimatāṁ variṣṭham.',
    meaning: 'Swift as mind, fast as wind, master of the senses, foremost among the wise.',
    source: 'Hanuman Stuti',
  },
  {
    label: 'Gita 18.66',
    text: 'सर्वधर्मान्परित्यज्य\nमामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो\nमोक्षयिष्यामि मा शुचः।',
    translit: 'Sarva-dharmān parityajya\nmām ekaṁ śaraṇaṁ vraja.\nAhaṁ tvāṁ sarva-pāpebhyo\nmokṣayiṣyāmi mā śucaḥ.',
    meaning: 'Abandon all forms of duty and surrender to Me alone. I will free you from every sin. Do not grieve.',
    source: 'Bhagavad Gita 18.66',
  },
  {
    label: 'Hanuman Chalisa Doha',
    text: 'श्रीगुरु चरन सरोज रज\nनिज मनु मुकुरु सुधारि।\nबरनउँ रघुबर बिमल जसु\nजो दायकु फल चारि।',
    translit: 'Shrī Guru Charana Saroja Raja\nNija Mana Mukuru Sudhāri.\nBaranauṁ Raghubara Bimala Jasu\nJo Dāyaku Phala Chāri.',
    meaning: 'Cleansing the mirror of my mind with the dust of my Guru’s lotus feet, I sing the pure glory of Raghuvara, giver of the four fruits of life.',
    source: 'Hanuman Chalisa, Opening Doha',
  },
  {
    label: 'Maha Mrityunjaya',
    text: 'ॐ त्र्यम्बकं यजामहे\nसुगन्धिं पुष्टिवर्धनम्।\nउर्वारुकमिव बन्धनान्\nमृत्योर्मुक्षीय मामृतात्।',
    translit: 'Oṁ tryambakaṁ yajāmahe\nsugandhiṁ puṣṭi-vardhanam.\nUrvārukam iva bandhanān\nmṛtyor mukṣīya māmṛtāt.',
    meaning: 'We worship the three-eyed Lord, fragrant and nourishing all. Like a ripe cucumber from its stem, free us from death — not from immortality.',
    source: 'Rigveda 7.59.12 (Maha Mrityunjaya Mantra)',
  },
];

const DEFAULT_PRESET = PRESETS[0]!;

export default function ShlokaCardGenerator() {
  const [text, setText] = useState(DEFAULT_PRESET.text);
  const [translit, setTranslit] = useState(DEFAULT_PRESET.translit);
  const [meaning, setMeaning] = useState(DEFAULT_PRESET.meaning);
  const [source, setSource] = useState(DEFAULT_PRESET.source);
  const [copied, setCopied] = useState(false);

  const ogUrl = useMemo(() => {
    const u = new URL('https://darshya.online/og/shloka');
    u.searchParams.set('text', text);
    if (translit) u.searchParams.set('translit', translit);
    if (meaning) u.searchParams.set('meaning', meaning);
    if (source) u.searchParams.set('source', source);
    return u.toString();
  }, [text, translit, meaning, source]);

  // Attribution-tagged variant for share buttons. utm_source=shloka-card
  // lets us measure which shares drive return traffic (PostHog funnel).
  const shareUrl = useMemo(() => {
    return ogUrl + (ogUrl.includes('?') ? '&' : '?') + 'utm_source=shloka-card&utm_medium=share';
  }, [ogUrl]);

  const shareText = useMemo(() => {
    const lines = [text.trim()];
    if (meaning) lines.push('', meaning);
    if (source) lines.push('— ' + source);
    return lines.join('\n');
  }, [text, meaning, source]);

  function track(event: string) {
    import('../../lib/posthog')
      .then((m) =>
        m.capture(event, {
          source,
          utm_source: 'shloka-card',
          text_length: text.length,
          has_translit: Boolean(translit),
          has_meaning: Boolean(meaning),
        }),
      )
      .catch(() => { /* ignore */ });
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setText(p.text);
    setTranslit(p.translit);
    setMeaning(p.meaning);
    setSource(p.source);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(ogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      track('shloka_card_link_copied');
    } catch { /* ignore */ }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/shlokas" className="hover:text-saffron-700">Shlokas</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Card maker</span>
      </nav>

      <header className="mb-8">
        <h1 className={`${H1.catalogue} mb-2`}>
          Make a shareable shloka card
        </h1>
        <p className="text-surface-700 max-w-2xl">
          Type any Sanskrit verse — get a beautiful 1200×630 image you can drop into
          WhatsApp, Instagram, X or Facebook. Free, no signup.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="px-3 py-1.5 text-xs border border-saffron-300 text-saffron-800 rounded-full hover:bg-saffron-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Shloka (Devanagari)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 400))}
              rows={4}
              className="w-full px-3 py-2 border border-surface-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-saffron-500"
              style={{ fontFamily: 'var(--font-noto-devanagari)' }}
              placeholder="ॐ सर्वे भवन्तु सुखिनः"
            />
            <p className="text-xs text-surface-500 mt-1">{text.length}/400</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Transliteration (optional)
            </label>
            <textarea
              value={translit}
              onChange={(e) => setTranslit(e.target.value.slice(0, 400))}
              rows={2}
              className="w-full px-3 py-2 border border-surface-300 rounded-md text-sm italic focus:outline-none focus:ring-2 focus:ring-saffron-500"
              placeholder="Om sarve bhavantu sukhinah"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Meaning (optional)
            </label>
            <textarea
              value={meaning}
              onChange={(e) => setMeaning(e.target.value.slice(0, 500))}
              rows={3}
              className="w-full px-3 py-2 border border-surface-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
              placeholder="May all beings be happy."
            />
            <p className="text-xs text-surface-500 mt-1">{meaning.length}/500</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 uppercase tracking-wider mb-1">
              Source (optional)
            </label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value.slice(0, 80))}
              className="w-full px-3 py-2 border border-surface-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-saffron-500"
              placeholder="Bhagavad Gita 2.47"
            />
          </div>
        </section>

        <section>
          <div className="aspect-[1200/630] rounded-lg overflow-hidden border border-surface-200 bg-surface-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img width={1200} height={630} 
              src={ogUrl}
              alt="Shloka card preview"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <a
              href={ogUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="shloka-card.png"
              onClick={() => track('shloka_card_downloaded')}
              className="px-3 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold text-center hover:bg-saffron-700"
            >
              Download
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('shloka_card_shared_whatsapp')}
              className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-semibold text-center hover:bg-green-700"
            >
              WhatsApp
            </a>
            <a
              href={tw}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('shloka_card_shared_twitter')}
              className="px-3 py-2 bg-surface-900 text-white rounded-md text-sm font-semibold text-center hover:opacity-90"
            >
              X / Twitter
            </a>
            <a
              href={fb}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('shloka_card_shared_facebook')}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold text-center hover:bg-blue-700"
            >
              Facebook
            </a>
          </div>

          <button
            onClick={copyLink}
            className="w-full mt-2 px-3 py-2 border border-surface-300 text-surface-800 rounded-md text-sm font-medium hover:bg-surface-50"
          >
            {copied ? 'Link copied ✓' : 'Copy image link'}
          </button>

          <p className="mt-4 text-xs text-surface-500 text-center">
            Cards are generated on demand. Right-click → Save image if download
            doesn’t trigger on your browser.
          </p>
        </section>
      </div>

      <section className="mt-12 rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <p className="text-surface-800 font-medium mb-2">
          Want daily shlokas + festival reminders in your inbox?
        </p>
        <Link
          href="/shlokas"
          className={buttonClass('primary', 'md')}
        >
          Browse our shloka library
        </Link>
      </section>
    </main>
  );
}
