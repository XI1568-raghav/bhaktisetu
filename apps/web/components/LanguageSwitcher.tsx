'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

import {
 LOCALE_NATIVE_NAMES,
 readClientLocale,
 writeClientLocale,
 type Locale,
} from '../lib/i18n/locales';

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * The languages this control can SWITCH TO. Deliberately narrower than
 * `Locale`: hi is the only locale with a catalog behind it at all
 * (lib/i18n/hi.json) and the `CONTENT_LABELS` map at the bottom of this file is
 * keyed by it. Offering ta/te/bn/mr here would advertise four languages with
 * zero translated keys each — the exact harm I-03 describes.
 *
 * It is NOT the set of locales this control can DISPLAY. A visitor who chose
 * தமிழ் in the footer must not be told they are reading English — see
 * `activeLocale` in the component below.
 */
export type SupportedLanguage = 'en' | 'hi';

interface LanguageSwitcherProps {
 currentLanguage?: SupportedLanguage;
 onLanguageChange?: (lang: SupportedLanguage) => void;
 /** Compact mode for tight spaces (icon-only toggle) */
 compact?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/**
 * Audit I18N-04 (2026-08-15): the native labels are read from
 * lib/i18n/locales.ts rather than re-typed here. "Four mutually inconsistent
 * language lists" is what that finding measured, and this file was one of them.
 */
const LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
 { code: 'en', label: 'English', nativeLabel: LOCALE_NATIVE_NAMES.en },
 { code: 'hi', label: 'Hindi', nativeLabel: LOCALE_NATIVE_NAMES.hi },
];

function isOffered(value: Locale | null | undefined): value is SupportedLanguage {
 return value === 'en' || value === 'hi';
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LanguageSwitcher({
 currentLanguage,
 onLanguageChange,
 compact = false,
}: LanguageSwitcherProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage || 'en');
 /**
  * The locale actually held in the shared store, which is not always one this
  * control offers. The footer landings (/hi /ta /te /bn /mr) can store any of
  * six, and this component used to compare a raw localStorage read against
  * `'en' | 'hi'` — so a visitor who chose தமிழ் saw the switcher confidently
  * report "English" while the middleware and the coverage notice both had them
  * on Tamil. `null` means the visitor has never chosen anything, which is not
  * the same as choosing English.
  */
 const [storedLocale, setStoredLocale] = useState<Locale | null>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);

 /**
  * Initialise from whichever store holds the choice — audit I-03 / I18N-05.
  *
  * `readClientLocale()` reads the COOKIE first and localStorage second. That
  * order is load-bearing: the middleware writes only the cookie (a footer click
  * on हिन्दी → /hi), so a localStorage-only read reported "English" one click
  * after the visitor had chosen Hindi.
  *
  * The read runs even when `currentLanguage` is supplied — the controlling
  * parent (components/ContentPageHeader:18) seeds itself from localStorage
  * ALONE and would otherwise pin this control to a stale answer. Note what the
  * line below does NOT do: it cannot push the stored locale into `language`
  * against a controlled parent, because the `[currentLanguage]` effect right
  * after it re-applies the prop in the same commit. That is why the display
  * locale is DERIVED (see `activeLocale`) rather than pushed into state.
  */
 useEffect(() => {
 const stored = readClientLocale();
 if (!stored) return;
 setStoredLocale(stored);
 if (!currentLanguage && isOffered(stored)) setLanguage(stored);
 }, [currentLanguage]);

 // Sync when controlled prop changes
 useEffect(() => {
 if (currentLanguage) {
 setLanguage(currentLanguage);
 }
 }, [currentLanguage]);

 // Close dropdown on outside click
 useEffect(() => {
 function handleClickOutside(e: MouseEvent) {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setIsOpen(false);
 }
 }
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Close on Escape
 useEffect(() => {
 function handleKeyDown(e: KeyboardEvent) {
 if (e.key === 'Escape') setIsOpen(false);
 }
 if (isOpen) {
 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
 }
 }, [isOpen]);

 /**
  * Audit I-03 / I18N-05. This used to be `localStorage.setItem` and nothing
  * else, which made the only in-app language control decorative: no server
  * code can read localStorage, so the middleware, lib/i18n/server.ts and the
  * coverage disclosure all carried on treating the visitor as English.
  *
  * Worse than invisible, it was undone. `syncClientLocale()` — run from the
  * root layout on every route change — resolves a cookie/localStorage conflict
  * in the COOKIE's favour, so a pick made here while a different locale sat in
  * the cookie was copied back over on the very next navigation.
  * `writeClientLocale` writes both, which is what makes the click count as the
  * explicit choice it is.
  */
 const handleSelect = (lang: SupportedLanguage) => {
 setLanguage(lang);
 setStoredLocale(writeClientLocale(lang));
 setIsOpen(false);
 onLanguageChange?.(lang);
 };

 /**
  * What the control REPORTS — the locale the rest of the product is actually
  * running on, which is the one in the shared store. The store wins over
  * `language` whenever it holds anything, because it is what the middleware,
  * lib/i18n/server.ts and the coverage notice all read; `language` is only the
  * answer for a visitor who has never chosen at all.
  *
  * This used to defer to the store ONLY for locales the control cannot offer
  * (ta/te/bn/mr), which fixed தமிழ் and left हिन्दी — the single locale with a
  * catalog behind it — still lying. Controlled by ContentPageHeader (its only
  * mount in the product, seeded from localStorage alone), a visitor who clicked
  * हिन्दी in the footer arrived on /content with the cookie on `hi`, the prop on
  * `en`, and this control announcing "English": audit I-03's headline symptom,
  * reproduced by __tests__/i18n-switcher-controlled-locale.test.tsx.
  *
  * `handleSelect` writes the store on every pick, so a click keeps the two in
  * step; the store can only be *ahead* of the prop, never behind it.
  */
 const activeLocale: Locale = storedLocale ?? language;
 const currentLang =
  LANGUAGES.find((l) => l.code === activeLocale) ??
  ({
   code: language,
   label: LOCALE_NATIVE_NAMES[activeLocale],
   nativeLabel: LOCALE_NATIVE_NAMES[activeLocale],
  } as (typeof LANGUAGES)[number]);

 // Compact toggle mode
 if (compact) {
 /**
  * Offer the language the visitor is NOT already in, judged by `activeLocale`
  * rather than `language` for the same reason the trigger is. A visitor whose
  * cookie says \u0939\u093F\u0928\u094D\u0926\u0940 was being offered \u0939\u093F\u0928\u094D\u0926\u0940. A visitor on ta/te/bn/mr is
  * offered English \u2014 the language the chrome around them is genuinely in \u2014
  * rather than Hindi, which is neither what they chose nor what they see.
  */
 const nextLang: SupportedLanguage = activeLocale === 'en' ? 'hi' : 'en';
 const nextLabel = activeLocale === 'en' ? '\u0939\u093F' : 'EN';
 return (
 <button
 onClick={() => handleSelect(nextLang)}
 className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-surface-700 hover:bg-saffron-50 hover:border-saffron-200 hover:text-saffron-700 transition-all"
 title={`Switch to ${nextLang === 'en' ? 'English' : 'Hindi'}`}
 >
 <Globe className="h-3.5 w-3.5" />
 {nextLabel}
 </button>
 );
 }

 // Dropdown mode
 return (
 <div ref={dropdownRef} className="relative inline-block">
 <button
 onClick={() => setIsOpen((prev) => !prev)}
 className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:bg-saffron-50 hover:border-saffron-200 hover:text-saffron-700 transition-all shadow-sm"
 aria-haspopup="listbox"
 aria-expanded={isOpen}
 >
 <Globe className="h-4 w-4 text-surface-500" />
 {/* Each language's own name, marked as being in that language, so a
     screen reader does not read हिन्दी or தமிழ் with English phonetics. */}
 <span lang={activeLocale}>{currentLang.nativeLabel}</span>
 <ChevronDown
 className={`h-3.5 w-3.5 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
 />
 </button>

 {isOpen && (
 /* aria-haspopup="listbox" on the trigger promises a listbox, and
    role="option" is only valid inside one. */
 <div role="listbox" aria-label="Language" className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-xl border border-surface-100 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
 {/* Selection is keyed to `activeLocale`, the same value the trigger
     renders, so the list can never contradict the button that opened
     it. When the active locale is one this control does not offer
     (ta/te/bn/mr), NOTHING is marked selected — that is the honest
     state, and marking English instead would move the exact false
     claim `activeLocale` exists to prevent into the listbox. */}
 {LANGUAGES.map((lang) => (
 <button
 key={lang.code}
 onClick={() => handleSelect(lang.code)}
 className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
 activeLocale === lang.code
 ? 'bg-saffron-50 text-saffron-700 font-semibold'
 : 'text-surface-700 hover:bg-surface-50'
 }`}
 role="option"
 aria-selected={activeLocale === lang.code}
 >
 <div className="flex items-center gap-2">
 <span lang={lang.code} className="text-base">{lang.nativeLabel}</span>
 {lang.code !== activeLocale && (
 <span className="text-xs text-surface-400">({lang.label})</span>
 )}
 </div>
 {activeLocale === lang.code && (
 <Check className="h-4 w-4 text-saffron-600" />
 )}
 </button>
 ))}
 </div>
 )}
 </div>
 );
}

// ─── Exports for content page integration ───────────────────────────────────────

export const CONTENT_LABELS: Record<SupportedLanguage, Record<string, string>> = {
 en: {
 pageTitle: 'Devotional Content Library',
 pageSubtitle: 'Explore thousands of aartis, chalisas, mantras, bhajans, and spiritual stories. Stream online or download for offline listening.',
 searchPlaceholder: 'Search by title, deity, or tag...',
 todaysFeatured: "Today's Featured",
 todaysFeaturedSubtitle: 'Curated daily devotional content for your spiritual journey',
 curatedCollections: 'Curated Collections',
 allContent: 'All',
 aarti: 'Aarti',
 chalisa: 'Chalisa',
 mantra: 'Mantra',
 bhajan: 'Bhajan',
 stories: 'Stories',
 title: 'Title',
 deity: 'Deity',
 type: 'Type',
 views: 'Views',
 likes: 'Likes',
 tracks: 'tracks',
 noContentFound: 'No content found.',
 tryDifferentSearch: 'Try a different search term.',
 checkBackSoon: 'Check back soon for new additions.',
 },
 hi: {
 pageTitle: '\u092D\u0915\u094D\u0924\u093F \u0938\u0902\u0917\u0940\u0924 \u092A\u0941\u0938\u094D\u0924\u0915\u093E\u0932\u092F',
 pageSubtitle: '\u0939\u091C\u093E\u0930\u094B\u0902 \u0906\u0930\u0924\u093F\u092F\u093E\u0901, \u091A\u093E\u0932\u0940\u0938\u093E, \u092E\u0902\u0924\u094D\u0930, \u092D\u091C\u0928 \u0914\u0930 \u0906\u0927\u094D\u092F\u093E\u0924\u094D\u092E\u093F\u0915 \u0915\u0925\u093E\u090F\u0901 \u0916\u094B\u091C\u0947\u0902\u0964 \u0911\u0928\u0932\u093E\u0907\u0928 \u0938\u0941\u0928\u0947\u0902 \u092F\u093E \u0911\u092B\u0932\u093E\u0907\u0928 \u0915\u0947 \u0932\u093F\u090F \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902\u0964',
 searchPlaceholder: '\u0936\u0940\u0930\u094D\u0937\u0915, \u0926\u0947\u0935\u0924\u093E \u092F\u093E \u091F\u0948\u0917 \u0938\u0947 \u0916\u094B\u091C\u0947\u0902...',
 todaysFeatured: '\u0906\u091C \u0915\u093E \u0935\u093F\u0936\u0947\u0937',
 todaysFeaturedSubtitle: '\u0906\u092A\u0915\u0940 \u0906\u0927\u094D\u092F\u093E\u0924\u094D\u092E\u093F\u0915 \u092F\u093E\u0924\u094D\u0930\u093E \u0915\u0947 \u0932\u093F\u090F \u0926\u0948\u0928\u093F\u0915 \u092D\u0915\u094D\u0924\u093F \u0938\u093E\u092E\u0917\u094D\u0930\u0940',
 curatedCollections: '\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0917\u094D\u0930\u0939',
 allContent: '\u0938\u092D\u0940',
 aarti: '\u0906\u0930\u0924\u0940',
 chalisa: '\u091A\u093E\u0932\u0940\u0938\u093E',
 mantra: '\u092E\u0902\u0924\u094D\u0930',
 bhajan: '\u092D\u091C\u0928',
 stories: '\u0915\u0925\u093E\u090F\u0901',
 title: '\u0936\u0940\u0930\u094D\u0937\u0915',
 deity: '\u0926\u0947\u0935\u0924\u093E',
 type: '\u092A\u094D\u0930\u0915\u093E\u0930',
 views: '\u0926\u0943\u0936\u094D\u092F',
 likes: '\u092A\u0938\u0902\u0926',
 tracks: '\u091F\u094D\u0930\u0948\u0915',
 noContentFound: '\u0915\u094B\u0908 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940\u0964',
 tryDifferentSearch: '\u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0916\u094B\u091C \u0936\u092C\u094D\u0926 \u0906\u091C\u092E\u093E\u090F\u0901\u0964',
 checkBackSoon: '\u091C\u0932\u094D\u0926 \u0939\u0940 \u0928\u0908 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0906\u090F\u0917\u0940\u0964',
 },
};
