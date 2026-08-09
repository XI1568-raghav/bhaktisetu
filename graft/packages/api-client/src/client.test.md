# packages\api-client\src\client.test.ts

- FetchImpl · type · L11-L11 — Type alias capturing the native fetch signature so the mock can be substituted type-safely.
- mockFetch · function · L13-L17 — Test helper that swaps globalThis.fetch for a vitest mock wrapping the given implementation so each test controls the client's network responses.
- jsonResponse · function · L19-L24 — Fixture builder that produces a fetch Response with a JSON-serialised body and JSON content-type at a given status code.
- nthCallInit · function · L27-L35 — Assertion helper that extracts the RequestInit passed to the Nth mocked fetch call so tests can inspect headers and method.
