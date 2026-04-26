'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import LanguageSwitcher, { CONTENT_LABELS, type SupportedLanguage } from './LanguageSwitcher';

interface ContentPageHeaderProps {
 currentType?: string;
 currentSearch?: string;
}

const STORAGE_KEY = 'poojly_language';

export default function ContentPageHeader({ currentType, currentSearch }: ContentPageHeaderProps) {
 const [language, setLanguage] = useState<SupportedLanguage>('en');

 useEffect(() => {
 const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
 if (stored && (stored === 'en' || stored === 'hi')) {
 setLanguage(stored);
 }
 }, []);

 const t = CONTENT_LABELS[language];

 return (
 <section className="bg-gradient-to-r from-saffron-600 via-saffron-500 to-temple-gold py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
 {t.pageTitle}
 </h1>
 <p className="text-saffron-100 text-lg max-w-2xl">
 {t.pageSubtitle}
 </p>
 </div>
 <div className="shrink-0 mt-1">
 <LanguageSwitcher
 currentLanguage={language}
 onLanguageChange={(lang) => setLanguage(lang)}
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
 placeholder={t.searchPlaceholder}
 className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-surface-800 placeholder:text-surface-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-300"
 />
 </div>
 </form>
 </div>
 </div>
 </section>
 );
}
