# i18n String Extraction Sweep — Tamil + Telugu + Bengali + Marathi to 90%

> **Roadmap item**: R-Q2-E-003 (P0) · **Authored**: 2026-06-13 · **Companion to**: R-Q3-E-005 (full sweep)

## Goal (Q2 slice)

Extract all UI strings into i18n format. Aim 90% string coverage in Tamil + Telugu + Bengali + Marathi (Hindi covered separately). 100% target deferred to Q3 R-Q3-E-005.

## Why before full launch

App-store launch (R-Q3-M-005) demands multi-language. ASO + Play Store description in regional languages = 2x install rate per industry data.

## Approach

### Step 1 — extraction tooling

Use `i18next-parser` OR `lingui` CLI:

```bash
pnpm add -D i18next-parser
npx i18next 'apps/web/**/*.{ts,tsx}' --output 'apps/web/lib/i18n/locales/$LOCALE/$NAMESPACE.json'
```

This walks all JSX files, extracts string literals via `t('key')` patterns + generates JSON skeleton per language.

### Step 2 — wrap existing hardcoded strings

Before extraction works:
- Replace `<h1>Welcome</h1>` → `<h1>{t('homepage.hero.welcome')}</h1>`
- Mass refactor via codemod (jscodeshift): ~3,000 string replacements

### Step 3 — translation per language

Tier 1 (must-ship): Hindi, Tamil, Telugu (3 languages already in macros pattern)
Tier 2 (nice-to-have Q2): Bengali, Marathi
Tier 3 (Q3): Gujarati, Punjabi, Kannada, Malayalam, Odia, Assamese

For Q2 target 90% in 4 languages: ~3,500 strings × 4 languages = 14K translations.

Cost: DeepL paid plan ₹2K/mo OR Google Translate API ~$50 total for one-time bulk + human review pass via community.

## Pass criteria (Q2 — partial)

- [ ] String extraction tooling integrated into pnpm i18n:extract script
- [ ] 90%+ of UI strings extracted (no major hardcoded literals)
- [ ] Tamil/Telugu/Bengali/Marathi 90% coverage (Hindi 100% covered separately)
- [ ] Language picker in /me/settings UI
- [ ] Default-locale detection from browser Accept-Language

## Engineering tickets

- R-Q2-E-003a: tooling setup + first extraction
- R-Q2-E-003b: codemod for ~3K hardcoded strings
- R-Q2-E-003c: Tamil + Telugu translation + review
- R-Q2-E-003d: Bengali + Marathi translation + review
- R-Q2-E-003e: language picker UI

## Closes

R-Q2-E-003 — spec shipped.
