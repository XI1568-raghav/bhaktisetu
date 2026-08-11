# graft — repo map

Small markdown nodes summarising this repo. `grep` any term, symbol, or
filename here, or run `graft ask "<task>"`. Each node carries prose plus exact
`file:line`; open a source file only to edit the named span.

The same graph is queryable as MCP tools (`graft_find_code`, `graft_find_all`,
`graft_trace_calls`, `graft_file_api`, `graft_repo_map`) where a host exposes them, and
as the `graft` CLI everywhere else. Edges — who calls what — live only in the
graph, not in these files: `graft callers <symbol>` is the only way to read them.

## Concepts

- [client-side-auth-api-base-url-resolution](client-side-auth-api-base-url-resolution.md) — Client-side auth & API base URL resolution · apps\web\app\gaushala-portal\layout.tsx, apps\web\app\gaushala-portal\page.tsx, apps\web\app\gaushala-portal\volunteers\page.tsx, apps\web\app\gift\GiftPujaForm.tsx, apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx, apps\web\app\gurukul-portal\GurukulPortalClient.tsx, apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx, apps\web\app\gurukuls\GurukulsListClient.tsx
- [commitlint.config](commitlint.config.md) — commitlint.config
- [feature-flagged-payment-with-backend-verification](feature-flagged-payment-with-backend-verification.md) — Feature-flagged payment with backend verification · apps\web\app\gift\GiftPujaForm.tsx, apps\web\app\gift\page.tsx, apps\web\app\gift\success\page.tsx
- [gaushala-cow-adoption-pages](gaushala-cow-adoption-pages.md) — Gaushala Cow Adoption Pages · apps\web\app\gaushala\[id]\page.tsx, apps\web\app\gaushala\page.tsx
- [gaushala-manager-portal](gaushala-manager-portal.md) — Gaushala Manager Portal · apps\web\app\gaushala-portal\layout.tsx, apps\web\app\gaushala-portal\messages\page.tsx, apps\web\app\gaushala-portal\page.tsx, apps\web\app\gaushala-portal\profile\page.tsx, apps\web\app\gaushala-portal\volunteers\page.tsx
- [gift-a-puja-flow](gift-a-puja-flow.md) — Gift-a-Puja Flow · apps\web\app\gift\GiftPujaForm.tsx, apps\web\app\gift\page.tsx, apps\web\app\gift\success\page.tsx
- [global-error-boundary](global-error-boundary.md) — Global Error Boundary · apps\web\app\global-error.tsx
- [graceful-degradation-in-portal-data-fetching](graceful-degradation-in-portal-data-fetching.md) — Graceful degradation in portal data fetching · apps\web\app\gaushala-portal\page.tsx, apps\web\app\gaushala-portal\profile\page.tsx, apps\web\app\gaushala-portal\volunteers\page.tsx
- [gurukul-directory-admission-application](gurukul-directory-admission-application.md) — Gurukul Directory & Admission Application · apps\web\app\gurukuls\[slug]\GurukulDetailClient.tsx, apps\web\app\gurukuls\[slug]\page.tsx, apps\web\app\gurukuls\apply\[programId]\ApplyClient.tsx, apps\web\app\gurukuls\apply\[programId]\page.tsx, apps\web\app\gurukuls\GurukulsListClient.tsx, apps\web\app\gurukuls\page.tsx
- [gurukul-owner-portal](gurukul-owner-portal.md) — Gurukul Owner Portal · apps\web\app\gurukul-portal\applications\ApplicationsClient.tsx, apps\web\app\gurukul-portal\applications\page.tsx, apps\web\app\gurukul-portal\GurukulPortalClient.tsx, apps\web\app\gurukul-portal\page.tsx
- [hardcoded-fixture-data-as-api-stand-in](hardcoded-fixture-data-as-api-stand-in.md) — Hardcoded fixture data as API stand-in · apps\web\app\gaushala\[id]\page.tsx, apps\web\app\gaushala\page.tsx
- [header-navigation-controls-menus](header-navigation-controls-menus.md) — Header navigation controls & menus · apps\web\components\LanguageSwitcher.tsx, apps\web\components\LibraryMegaPanel.tsx, apps\web\components\ListYourBusinessDropdown.tsx, apps\web\components\MoreDropdown.tsx, apps\web\components\NavAuthButton.tsx, apps\web\components\NavCartButton.tsx
- [help-center](help-center.md) — Help Center · apps\web\app\help\articles\[lang]\[slug]\page.tsx, apps\web\app\help\page.tsx
- [isr-json-ld-seo-architecture](isr-json-ld-seo-architecture.md) — ISR + JSON-LD SEO architecture · apps\web\app\gift\page.tsx, apps\web\app\gita\[chapter]\page.tsx, apps\web\app\gita\page.tsx, apps\web\app\help\articles\[lang]\[slug]\page.tsx, apps\web\app\hindu-philosophies\page.tsx, apps\web\app\hindu-symbols\[slug]\page.tsx, apps\web\app\jyotirlinga\[slug]\page.tsx, apps\web\app\jyotirlinga\page.tsx
- [marketing-landing-pages](marketing-landing-pages.md) — Marketing Landing Pages · apps\web\app\hi\page.tsx, apps\web\app\launch\page.tsx
- [playwright.config](playwright.config.md) — playwright.config
- [static-seo-content-hubs](static-seo-content-hubs.md) — Static SEO Content Hubs · apps\web\app\gita\[chapter]\page.tsx, apps\web\app\gita\page.tsx, apps\web\app\hindu-philosophies\[slug]\page.tsx, apps\web\app\hindu-philosophies\page.tsx, apps\web\app\hindu-symbols\[slug]\page.tsx, apps\web\app\hindu-symbols\page.tsx, apps\web\app\jyotirlinga\[slug]\page.tsx, apps\web\app\jyotirlinga\page.tsx
- [thin-server-page-client-component-split](thin-server-page-client-component-split.md) — Thin server page / client component split · apps\web\app\gurukul-portal\applications\page.tsx, apps\web\app\gurukul-portal\page.tsx, apps\web\app\gurukuls\[slug]\page.tsx, apps\web\app\gurukuls\apply\[programId]\page.tsx, apps\web\app\gurukuls\page.tsx
- [vitest.config](vitest.config.md) — vitest.config

## Files

1438 per-file wiring cards mirror the source tree under `graft/` (1265 carry extracted symbols). They are deliberately not enumerated here —
`grep` a symbol or `find`/`ls` a filename under `graft/` to land on the card for that file.
