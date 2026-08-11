# apps\api\scripts\smoke-all-roles.mjs

- record · function · L93-L95 — Appends a single check outcome to the shared results list for later pass/fail reporting.
- req · function · L97-L115 — Performs an authenticated API request and normalizes the outcome into status plus parsed-or-raw body so checks never throw on network or JSON errors.
- webGet · function · L117-L124 — Fetches a web page status without following redirects so the smoke test can distinguish real pages from redirect responses.
- login · function · L126-L129 — Logs a demo account in with the shared demo password and extracts the bearer token needed for authenticated checks.
- runPublic · function · L131-L137 — Verifies every unauthenticated public API endpoint returns a 2xx response.
- runRole · function · L139-L156 — For one role, confirms login works, its dashboard page loads, and each of its role-scoped API endpoints returns 2xx with the role's token.
- permsCheck · function · L158-L170 — Guards the permission boundary by asserting a devotee token is rejected with 401/403 from an admin-only gurukul endpoint.
- adminGurukulMutation · function · L172-L198 — Exercises the admin gurukul verify mutation by toggling and restoring a gurukul's isVerified flag, while distinguishing real auth guard bugs from merely unseeded prod data.
- publicWebPages · function · L200-L225 — Checks that the critical public web pages visitors use respond with 200 or an expected redirect.
