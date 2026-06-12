# i18n Full Sweep — en/hi/ta/te/bn/mr 100% string coverage + RTL safety

> **Roadmap item**: R-Q3-E-005 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q2-E-003 (string extraction)

## Goal

100% UI string coverage in 6 languages (English / Hindi / Tamil / Telugu / Bengali / Marathi). RTL safety check for future Urdu/Arabic expansion.

## Phase plan (3 cycles)

### Phase 1 (R-Q2-E-003 ship — string extraction sweep)

Extract all UI strings into i18n-friendly format. Use next-i18next OR react-intl.

```typescript
// apps/web/lib/i18n/keys.ts
export const KEYS = {
  homepage: {
    hero_title: 'Verified-temple platform for devotional services',
    hero_cta: 'Book your first puja',
    // ... 500+ keys total estimated
  },
  // per-page namespaces...
};
```

Total strings: ~3,000 UI strings + ~500 email/notification strings = ~3,500 total.

### Phase 2 (R-Q3-E-005 — translation work)

- English source (already in repo)
- Hindi: translate via DeepL/Google → human review by Hindi reviewer (cross-ref macros-v1-hi.md pattern)
- Tamil: same
- Telugu: same
- Bengali: same
- Marathi: same

Translation cost estimate:
- 3,500 strings × 6 languages = 21,000 string-translations
- DeepL API: ~$0.025/1000 chars = ~$50 total
- Human review: ₹2/string × 5 langs = ₹35K total (or pro-bono via community contributors)

### Phase 3 (R-Q3-E-005 cont — RTL safety)

- Audit CSS for hardcoded `left:` / `right:` → use `inline-start:` / `inline-end:`
- Audit flexbox `flex-direction: row` → `row-reverse` aware
- Add `dir="rtl"` toggle test in Storybook
- No Urdu/Arabic UI launch v1 (defer), but architecturally ready

## DB schema delta

Each user has `preferredLanguage: Language` (already exists per `User.preferredLanguage`).

Add notification + email send via preferred language:

```typescript
const userLang = await getUserLanguage(userId);
const subject = t(userLang, 'email.booking_confirm.subject', { bookingId });
```

## Translation key naming convention

```
{namespace}.{page_or_component}.{element_type}.{specific_label}

examples:
homepage.hero.title
homepage.hero.cta_primary
booking.confirm.success_message
email.booking_24h_reminder.subject
auth.login.error_invalid_otp
```

## Pass criteria

- [ ] 100% UI strings extracted (zero hardcoded EN strings in JSX)
- [ ] 6 language JSON files in apps/web/lib/i18n/locales/
- [ ] Language picker in user settings
- [ ] RTL audit passes (CSS lint rule for hardcoded left/right)
- [ ] Language preference persists across sessions
- [ ] Default to user's browser locale on signup
- [ ] Email + WA notifications respect preferredLanguage

## Engineering tickets

- R-Q3-E-005a: extraction tooling (i18next-extract OR custom script)
- R-Q3-E-005b: translate Hindi (cross-ref macros pattern)
- R-Q3-E-005c: translate Tamil + Telugu
- R-Q3-E-005d: translate Bengali + Marathi
- R-Q3-E-005e: RTL audit + CSS lint rule
- R-Q3-E-005f: language picker UI

## Closes

R-Q3-E-005 — spec shipped.
