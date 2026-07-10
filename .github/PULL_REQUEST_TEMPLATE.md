<!--
  Lightweight spec-driven PR template (P4.19). The Spec + Acceptance criteria
  sections encode the "write the spec before coding" discipline without the
  ceremony of full spec-kit. The darshya-code-review skill + the ai-review.yml
  workflow read these sections. Keep it short — bullet points, not prose.
-->

## Spec

<!-- What this changes and why. 1-3 sentences. Link the issue/ticket if any. -->

-

## Acceptance criteria

<!-- The falsifiable checks that mean this is DONE. The AI reviewer + verify-gate
     look for evidence these were met. -->

- [ ] criterion 1
- [ ] criterion 2

## Verification evidence

<!-- A claim is not verification (2026-05-28 incident). Attach the actual output
     of at least one check. Delete the lines that don't apply. -->

- [ ] Deploy: `curl -sI https://darshya.online/` shows `server: cloudflare` + `x-render-origin-server: Render`
- [ ] Migration: `prisma migrate status` clean + `node apps/api/scripts/check-prod-tables.mjs` passes
- [ ] Tests: `pnpm test:agent` — paste the verdict line (e.g. `verdict: PASS, 1242 passed`)
- [ ] UI: Playwright e2e spec added/updated, or `mcp__playwright` snapshot confirms render

## Checklist

- [ ] No secrets committed (env keys/tokens/DB URLs go in Render env or GH secrets)
- [ ] New `.github/workflows/*.yml`? → ran `darshya-free-tier-check` (monthly Actions min ≤ 5% of budget)
- [ ] New Prisma migration? → no `CREATE INDEX CONCURRENTLY` inside it (see `darshya-prisma-migrate`)
- [ ] Commit message(s) follow Conventional Commits (`type(scope): subject`)
- [ ] `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` on Claude-authored commits
