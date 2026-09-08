# main is red — the 8 failures blocking PR #254

`main` at `cf545d23` ("chore: merge origin/main before pushing the home redesign") fails
8 web tests. `cd9d0b1a` (2026-09-07 21:36) was the last green run. Nothing in PR #254
touches `apps/web`, so it inherits these without causing them.

All 8 are the home redesign moving the page out from under assertions that were pinned
to the old composition. Run locally with:

```
cd apps/web && npx vitest run __tests__/design-tokens.test.ts __tests__/home-deferral-ranking.home01.test.ts __tests__/page-chrome-uniformity.test.ts __tests__/type-scale-callsites.test.ts __tests__/images-perf.test.ts
```

## 1. `home-deferral-ranking.home01.test.ts` — 3 failures

- **composition canary**: `expected 9 to be 12`. The homepage now has **9** top-level
  children, not 12. The test's own message is the instruction: re-measure the ranked
  deferral list in the file header, then update the number. Do not just bump it —
  the list names sections, and the point of the file is that the ranking cannot go
  stale silently.
- **below-fold text-only set**: `expected [ …(3) ] to deeply equal [ …(4) ]` — the set
  shrank from 4 to 3.
- **`.defer-paint` coverage**: `expected [ …(2) ] to deeply equal []` — 2 below-fold,
  image-free sections still pay full layout and paint. Either add `.defer-paint`
  (`app/globals.css:798`, `content-visibility: auto` + `contain-intrinsic-size`) to
  those two section roots, or justify the exemption.

## 2. `design-tokens.test.ts:1950` — 1 failure

`1 measured paragraph renders below the 13px floor .prose-meta declares (ceiling 0)`.
The offender is quoted in the failure:

```
className="max-w-[38ch] text-xs" style={{ color: 'var(--color-text-muted)' }}
```

Fix: use `.prose-body`, or `.prose-meta` if it is genuinely metadata.

## 3. `page-chrome-uniformity.test.ts` — 2 failures

- **12px legibility floor**: `expected [ 'app/page.tsx text-[10px]', …(5) ] to deeply
  equal []` — 6 call sites ship an arbitrary size below 12px, at least one in
  `app/page.tsx` as `text-[10px]`.
- **`page-chrome-uniformity.test.ts:488`**: `expected 2 to be greater than or equal to 3`
  — the homepage section CTAs that opt into tap-safe sizing dropped from 3 to 2.

## 4. `type-scale-callsites.test.ts` — 2 failures

- `an arbitrary text-[Npx] is a paragraph size no --text-* token can correct: expected
  { 'app/page.tsx': [ …(2) ], …(3) } to deeply equal {}` — 4 files, `app/page.tsx`
  among them with 2 occurrences.
- exemptions test: `expected [ …(6) ] to deeply equal [ …(2) ]` — sub-12px type now
  survives in 6 places where only 2 (mockup files) are allowed.

## 5. `images-perf.test.ts` — 2 more, branch-only

These fail on the route-group branch but **not** on main:

- API-supplied puja images are routed through the resize helper
- the four heaviest pages give every `<img>` explicit width, height and loading

They come from the `(index)` route-group move changing which files the scanner walks.

---

Once these are green, PR #254 merges and the Razorpay key swap becomes dispatchable
(`gh workflow run razorpay-test-mode.yml --ref main -f mode=test`), which unblocks the
money-path testing described in `FINDINGS.md`.
