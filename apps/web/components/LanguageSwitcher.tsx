'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SupportedLanguage = 'en' | 'hi';

interface LanguageSwitcherProps {
 currentLanguage?: SupportedLanguage;
 onLanguageChange?: (lang: SupportedLanguage) => void;
 /** Compact mode for tight spaces (icon-only toggle) */
 compact?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
 { code: 'en', label: 'English', nativeLabel: 'English' },
 { code: 'hi', label: 'Hindi', nativeLabel: '\u0939\u093F\u0928\u094D\u0926\u0940' },
];

const STORAGE_KEY = 'poojly_language';

// ─── Component ──────────────────────────────────────────────────────────────────

export default function LanguageSwitcher({
 currentLanguage,
 onLanguageChange,
 compact = false,
}: LanguageSwitcherProps) {
 const [isOpen, setIsOpen] = useState(false);
 const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage || 'en');
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Initialize from localStorage on mount
 useEffect(() => {
 if (!currentLanguage) {
 const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
 if (stored && (stored === 'en' || stored === 'hi')) {
 setLanguage(stored);
 }
 }
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

 const handleSelect = (lang: SupportedLanguage) => {
 setLanguage(lang);
 localStorage.setItem(STORAGE_KEY, lang);
 setIsOpen(false);
 onLanguageChange?.(lang);
 };

 const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]!;

 // Compact toggle mode
 if (compact) {
 const nextLang = language === 'en' ? 'hi' : 'en';
 const nextLabel = language === 'en' ? '\u0939\u093F' : 'EN';
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
 <span>{currentLang.nativeLabel}</span>
 <ChevronDown
 className={`h-3.5 w-3.5 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
 />
 </button>

 {isOpen && (
 <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-xl border border-surface-100 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
 {LANGUAGES.map((lang) => (
 <button
 key={lang.code}
 onClick={() => handleSelect(lang.code)}
 className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
 language === lang.code
 ? 'bg-saffron-50 text-saffron-700 font-semibold'
 : 'text-surface-700 hover:bg-surface-50'
 }`}
 role="option"
 aria-selected={language === lang.code}
 >
 <div className="flex items-center gap-2">
 <span className="text-base">{lang.nativeLabel}</span>
 {lang.code !== language && (
 <span className="text-xs text-surface-400">({lang.label})</span>
 )}
 </div>
 {language === lang.code && (
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
