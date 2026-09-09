# Fix-agent brief

You are fixing a defect found by testing live production. The owner has authorized these
changes. Work in `E:\NewClaude\bhaktisetu` on branch `fix/customer-test-findings`.

## Rules — a violation costs someone else their work

1. **Touch ONLY the files listed in your task, plus test files you create.** Five other
   agents are editing this same working tree right now. Writing to a file outside your
   list will collide with them.
2. **Never run a git command that changes state.** No `add`, `commit`, `push`, `checkout`,
   `stash`, `reset`, `merge`, `rebase`. The tree has ~155 unrelated modified files from a
   concurrent process — `git add -A` would sweep them into your change. Read-only git
   (`log`, `show`, `diff`, `blame`) is fine. The orchestrator commits everything centrally.
3. **Test first.** Write a test that FAILS for the reason in the finding, confirm it fails,
   then fix, then confirm it passes. A fix without a test that would have caught the bug is
   not done. This repo's own history has two cases of a bug being "fixed" twice because the
   first fix had no test.
4. **Run the suites that touch your files** before reporting. API: `cd apps/api && npx vitest run <paths>`. Web: `cd apps/web && npx vitest run <paths>`.
5. **Do not deploy or call production write endpoints.** Production still runs a LIVE
   Razorpay key. Reading prod to confirm a repro is fine; writing to it is not.

## Style — match what is already there

Read the file before editing. This codebase documents *why*, not *what*, and its comments
carry measured evidence ("Measured on prod 2026-09-08: … answered 100 where the branch
intends 60"). Match that register: state the mechanism and the consequence, not the
obvious. Do not add narration comments over self-evident lines.

Follow the existing error conventions in the file you are editing — status codes, the
`{error, message, code}` envelope, and Zod `safeParse` (never bare `.parse()`, which
throws and surfaces as a 500).

## Report back

State: the finding you fixed, the files you changed, the test you added and what it asserts,
the exact command you ran and its result, and anything you deliberately did NOT change and
why. If the finding turns out to be wrong or already fixed, say so — that is a good outcome
and far better than a cosmetic edit that pretends to fix it.
