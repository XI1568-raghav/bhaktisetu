/**
 * R-Q2-E-015 — Release identifier surface.
 *
 * Single source of truth for the build's Sentry release tag.
 *
 * Set at build time by `.github/workflows/sentry-release.yml`:
 *   NEXT_PUBLIC_SENTRY_RELEASE = darshya@<sha>
 *
 * When unset (local dev / preview deploys without the workflow): returns
 * `'dev'` so downstream consumers never crash on missing env. The Sentry
 * release tracking workflow only fires on `git tag v*` pushes, so dev
 * builds intentionally do not produce a release tag.
 *
 * Use cases:
 * - Footer build-id badge for ops debugging ("which version is live?")
 * - Browser-side error reporters (e.g. window.onerror beacon) tagging events
 * - Server-component logging that includes the release in request context
 */

const FALLBACK_RELEASE = 'dev';

export function getRelease(): string {
  return process.env.NEXT_PUBLIC_SENTRY_RELEASE || FALLBACK_RELEASE;
}

/**
 * Short SHA suffix for display surfaces (footer badge etc).
 * `darshya@abc1234567...` → `abc1234`.
 */
export function getReleaseShortSha(): string {
  const release = getRelease();
  if (release === FALLBACK_RELEASE) return FALLBACK_RELEASE;
  const at = release.indexOf('@');
  if (at < 0) return release.slice(0, 7);
  return release.slice(at + 1, at + 8);
}

/**
 * True when this build was produced by the Sentry release workflow.
 * Helps gate UI surfaces that should only show on tagged releases
 * (e.g. "report a bug" link wired to Sentry user-feedback widget).
 */
export function hasReleaseTag(): boolean {
  return getRelease() !== FALLBACK_RELEASE;
}
