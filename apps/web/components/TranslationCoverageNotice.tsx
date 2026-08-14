'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  DEFAULT_LOCALE,
  LOCALE_NATIVE_NAMES,
  LOCALE_OFFER_DISMISSED_KEY,
  isLocale,
  negotiateLocale,
  readClientLocale,
  syncClientLocale,
  type Locale,
} from '../lib/i18n/locales';

/**
 * Tells a visitor, in their own language, that the page they are looking at is
 * mostly still English — and keeps <html lang> truthful while it is at it.
 *
 * Audit I-02 / I18N-01 (2026-08-12): the footer advertises five Indian
 * languages on every page of the product. Picking one lands you on a page that
 * measured 18.5% translated in a live DOM scan, and every onward link left the
 * language behind. The landings did disclose this — but only on themselves, so
 * the moment you clicked anything the product went back to silently claiming to
 * be localised.
 *
 * This surfaces the same disclosure wherever the visitor actually is. It is the
 * honest half of the fallback: lib/t.ts still renders English when a key is
 * untranslated (a blank UI would be worse), and this says so out loud.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO RULES, BOTH LEARNED THE HARD WAY (audit I-05, second pass):
 *
 * 1. <html lang> DESCRIBES THE DOCUMENT, NEVER THE VISITOR'S WISH.
 *    The first version of this component wrote the visitor's STORED LOCALE onto
 *    document.documentElement. But lib/t.ts is still called without a locale on
 *    all nine wired pages, so a product page is 100% English no matter what the
 *    visitor picked — and a Hindi-preferring visitor on /pujas ended up with
 *    `<html lang="hi">` wrapped around an entirely English document. A screen
 *    reader then reads English pricing and legal copy with Hindi phonetics, and
 *    the `html[lang="hi"]` Devanagari font rule in globals.css:259 activates for
 *    text with no Devanagari in it. That is strictly worse than the hardcoded
 *    "en" it was meant to fix, and it fabricates a claim about content.
 *
 *    The only truthful client-side source is a page that declares its own
 *    content language: every locale landing renders `<main lang="…">`
 *    (app/hi/page.tsx:53 and components/LangLanding.tsx), as do the localized
 *    city pages (app/ta/chennai, app/te/hyderabad, app/mr/pune). No
 *    declaration means English, because that is what the page is.
 *
 * 2. DISCLOSE WHERE THERE IS SOMETHING TO DISCLOSE.
 *    On a page that IS in the visitor's language there is nothing to warn
 *    about, and the landings already print this exact sentence in their own
 *    footer (app/hi/page.tsx:111) — rendering it again put the same paragraph
 *    on the page twice.
 *
 * 3. RE-READ ON EVERY NAVIGATION, NOT ONLY ON MOUNT.
 *    This component is rendered from the root layout, and the App Router does
 *    NOT remount the root layout on a client-side navigation — it swaps only the
 *    page slot beneath it. With `useEffect(…, [])` both rules above were applied
 *    once per full page load and then froze. A visitor landing on /hi got a
 *    correct `<html lang="hi">`, tapped "पूजा बुक करें" (a <Link>, so no
 *    reload), and carried that `lang="hi"` onto the entirely English /pujas
 *    page — reinstating rule 1's exact failure one click later, with the
 *    disclosure ALSO suppressed because `pageLocale` still read 'hi'. The route
 *    is the only signal available that the document underneath has changed,
 *    hence `usePathname()` as the dependency. (usePathname is a client hook and
 *    does not opt any route out of static prerendering.)
 *
 * Renders nothing for English, so the default experience is untouched.
 */

type NonDefaultLocale = Exclude<Locale, 'en'>;

/**
 * Verbatim from the five landing pages — app/{hi,ta,te,bn,mr}/page.tsx
 * `footerNote`. Human-authored copy already shipped in this repo; nothing here
 * is machine-translated.
 */
const DISCLOSURE: Record<NonDefaultLocale, string> = {
  hi: 'पूर्ण हिंदी अनुवाद प्रगति पर है। अधिकांश पृष्ठ अभी अंग्रेज़ी में हैं।',
  ta: 'முழுமையான தமிழ் மொழிபெயர்ப்பு முன்னேற்றத்தில் உள்ளது. பெரும்பாலான பக்கங்கள் தற்போது ஆங்கிலத்தில் உள்ளன.',
  te: 'పూర్తి తెలుగు అనువాదం పురోగతిలో ఉంది. చాలా పేజీలు ప్రస్తుతం ఆంగ్లంలో ఉన్నాయి.',
  bn: 'সম্পূর্ণ বাংলা অনুবাদ চলমান। বেশিরভাগ পৃষ্ঠা বর্তমানে ইংরেজিতে রয়েছে।',
  mr: 'पूर्ण मराठी भाषांतर प्रगतीपथावर आहे. बहुतेक पाने सध्या इंग्रजीत आहेत.',
};

/**
 * The language the DOCUMENT is written in, as declared by the page itself.
 * `null` when the page makes no claim — which is the honest reading of every
 * page that has not been translated.
 *
 * Scoped to `main[lang]` deliberately: the footer's language switcher links
 * carry `lang="hi"`, `lang="ta"` … (app/layout.tsx:574-578) so that a screen
 * reader pronounces each language's own name correctly. Those are labels, not
 * page content, and a looser selector would read one of them as the page
 * language on every single page of the site.
 */
function readPageContentLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const declared = document.querySelector('main[lang]')?.getAttribute('lang');
  if (!declared) return null;
  const primary = declared.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

/**
 * Has this visitor already waved the offer away? Kept out of the locale cookie
 * on purpose — see LOCALE_OFFER_DISMISSED_KEY. localStorage throws in Safari
 * private mode, so every access is guarded.
 */
function offerWasDismissed(): boolean {
  try {
    return window.localStorage?.getItem(LOCALE_OFFER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function TranslationCoverageNotice() {
  // Starts at the default so the client render matches the statically rendered
  // HTML; the real state is applied after mount. The root layout deliberately
  // does NOT read the cookie — doing so would opt all ~370 routes out of static
  // prerendering (see lib/i18n/server.ts).
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [pageLocale, setPageLocale] = useState<Locale | null>(null);
  // Audit I-08. The locale this visitor's BROWSER asks for, when they have
  // never made a choice of their own. Null in every other case — including
  // "they chose English", which is a decision and outranks any header.
  const [offer, setOffer] = useState<Locale | null>(null);
  // The route the page slot is currently showing. See rule 3 above — without
  // this the whole component is a one-shot that describes the first page of the
  // session forever.
  const pathname = usePathname();

  useEffect(() => {
    // syncClientLocale also reconciles the two stores that share the
    // `poojly_language` key — the cookie the middleware writes and the
    // localStorage entry components/LanguageSwitcher.tsx writes. This component
    // is mounted from the root layout (app/layout.tsx:582), so it is the one
    // client surface guaranteed to run on every page view. See
    // lib/i18n/locales.ts for why the two stores were never converging.
    // `readClientLocale` before `syncClientLocale`: null means the visitor has
    // never chosen a language at all, which is NOT the same as choosing
    // English, and that distinction is the whole gate on the offer below.
    const chosen = readClientLocale();
    const active = syncClientLocale();
    const page = readPageContentLocale();
    setLocale(active);
    setPageLocale(page);

    // AUDIT I-08 — read the one signal that states the visitor's language.
    // Only ever an offer: nothing here writes the locale cookie, so a header
    // can never switch the product on somebody (see lib/i18n/locales.ts for
    // why that matters at 5% catalog coverage), and an anonymous English page
    // view still emits no Set-Cookie and stays one shared cache entry.
    const suggested =
      chosen === null && !offerWasDismissed()
        ? negotiateLocale(
            typeof navigator === 'undefined'
              ? null
              : (navigator.languages ?? navigator.language),
          )
        : null;
    // Nothing to offer on a page already written in that language.
    setOffer(suggested && suggested !== page ? suggested : null);

    // Keep <html lang> truthful. app/layout.tsx:265 hardcodes "en", which also
    // means the html[lang="hi"] Devanagari font rule in globals.css can never
    // match on the Hindi landing (audit I-05). Correcting it here fixes both
    // for a real visitor without forcing dynamic rendering — but it is set from
    // what the PAGE declares, never from what the visitor asked for.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = page ?? DEFAULT_LOCALE;
    }
  }, [pathname]);

  const dismissOffer = () => {
    setOffer(null);
    try {
      window.localStorage?.setItem(LOCALE_OFFER_DISMISSED_KEY, '1');
    } catch {
      // Storage unavailable — it reappears next visit, which is the safe
      // direction to fail for an informational offer.
    }
  };

  // English visitor: nothing to disclose. They may still have a language their
  // BROWSER asked for that they have never been told about (audit I-08).
  if (locale === DEFAULT_LOCALE) {
    if (!offer) return null;

    return (
      <aside
        lang={offer}
        data-testid="locale-offer"
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs leading-relaxed text-surface-500"
      >
        {/* A plain <a>, not next/link, deliberately: the middleware has to see
            this navigation to store the choice, and a prefetched static route
            can be replayed from the Next 15 client Router Cache for minutes
            without any request going out (same reasoning as the prefetch={false}
            note in components/LangLanding.tsx). */}
        <a
          href={`/${offer}`}
          hrefLang={offer}
          className="font-semibold text-saffron-400 underline underline-offset-2 hover:text-saffron-300"
        >
          {LOCALE_NATIVE_NAMES[offer]}
        </a>
        {/* Offer and caveat in the same breath. The destination is a landing
            page over mostly-English chrome; saying so here is the difference
            between an invitation and a false claim. Copy is verbatim from the
            landing pages — nothing machine-translated. */}
        <span>{DISCLOSURE[offer as NonDefaultLocale]}</span>
        <button
          type="button"
          onClick={dismissOffer}
          data-testid="locale-offer-dismiss"
          // English, and marked as English: translating one UI word is a content
          // task, and lib/t.ts's whole contract is that a fallback string says
          // which language it is actually in rather than passing itself off as
          // the target language.
          lang="en"
          aria-label="Dismiss"
          className="text-surface-600 hover:text-surface-400"
        >
          &times;
        </button>
      </aside>
    );
  }

  // The page is already in their language and says so itself.
  if (pageLocale === locale) return null;

  return (
    <p
      lang={locale}
      className="mt-3 text-center text-xs leading-relaxed text-surface-500"
      data-testid="translation-coverage-notice"
    >
      {DISCLOSURE[locale as NonDefaultLocale]}
    </p>
  );
}
