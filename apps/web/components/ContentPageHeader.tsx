'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import LanguageSwitcher, { type SupportedLanguage } from './LanguageSwitcher';
import { DEFAULT_LOCALE, readClientLocale, type Locale } from '../lib/i18n/locales';
import { t } from '../lib/t';
import { H1 } from '../components/ui/heading-recipe';

interface ContentPageHeaderProps {
 currentType?: string;
 currentSearch?: string;
 /**
  * The locale the SERVER resolved for this request. Seeding from it is what
  * makes the first paint correct: this component used to start on `'en'` and
  * only correct itself in an effect, so a Hindi visitor got an English hero on
  * every server render and a flash of English on every navigation.
  */
 locale?: Locale;
}

export default function ContentPageHeader({
 currentType,
 currentSearch,
 locale: serverLocale = DEFAULT_LOCALE,
}: ContentPageHeaderProps) {
 const router = useRouter();
 const [locale, setLocale] = useState<Locale>(serverLocale);

 /**
  * Audit I-03 / I18N-05. This used to be a raw
  * `localStorage.getItem('poojly_language')` validated against `'en' | 'hi'`,
  * which had two consequences:
  *   - the COOKIE was ignored, so a footer click on हिन्दी (which the
  *     middleware records as a cookie, not localStorage) was invisible here;
  *   - ta/te/bn/mr were discarded to 'en', so this component told
  *     LanguageSwitcher a visitor on தமிழ் was reading English.
  * `readClientLocale()` is the shared reader: cookie first, storage second,
  * every supported locale preserved. It runs after hydration only to catch a
  * store the server could not see; the server value is already correct.
  */
 useEffect(() => {
 const stored = readClientLocale();
 if (stored && stored !== locale) setLocale(stored);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 /**
  * The labels come from lib/i18n/en.json + hi.json through the shared
  * translator, not from a component-local map. The map this file used to read
  * (CONTENT_LABELS) authored 21 Hindi labels and this file rendered 3 of them;
  * the other 18 were dead copy sitting beside their English twins hardcoded in
  * app/content/page.tsx.
  */
 const tr = t('content', locale);

 /**
  * A language pick changes a cookie the SERVER reads — app/content/page.tsx
  * resolves the locale server-side — so the client state alone would leave the
  * list body, the tabs and the section heading in the previous language until
  * the next full navigation. `router.refresh()` re-runs the server render
  * against the cookie the switcher just wrote.
  */
 const handleLanguageChange = (lang: SupportedLanguage) => {
 setLocale(lang);
 router.refresh();
 };

 return (
 <section className="bg-gradient-to-r from-saffron-600 via-saffron-500 to-temple-gold py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <h1
 className={`${H1.detail} mb-3`}
 lang={tr.entry('pageTitle').lang}
 >
 {tr('pageTitle')}
 </h1>
 <p
 className="prose-lead text-saffron-100 max-w-2xl"
 lang={tr.entry('pageSubtitle').lang}
 >
 {tr('pageSubtitle')}
 </p>
 </div>
 <div className="shrink-0 mt-1">
 <LanguageSwitcher
 currentLanguage={locale === 'hi' ? 'hi' : 'en'}
 onLanguageChange={handleLanguageChange}
 />
 </div>
 </div>

 {/* Search */}
 <div className="mt-8 max-w-2xl">
 <form action="/content" method="GET">
 {currentType && <input type="hidden" name="type" value={currentType} />}
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
 <input
 type="text"
 name="search"
 defaultValue={currentSearch}
 placeholder={tr('search')}
 lang={tr.entry('search').lang}
 className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-surface-800 placeholder:text-surface-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </form>
 </div>
 </div>
 </section>
 );
}
