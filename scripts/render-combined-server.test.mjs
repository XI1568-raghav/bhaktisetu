/**
 * Routing tests for the single-container entrypoint.
 *
 * These matter more than they look. Collapsing two Render services into one is
 * what keeps the account inside the 750 free instance-hours, but it also removes
 * the redundancy: a routing mistake no longer degrades one surface, it takes
 * down the whole product. In particular a misrouted `/health` fails Render's
 * health check and the platform restarts a container that was working.
 */
import { describe, it, expect } from 'vitest';
import { routeToApi } from './render-combined-server.mjs';

describe('routeToApi — host wins', () => {
  it('sends the api subdomain to the API regardless of path', () => {
    // The mobile app and the browser both call api.darshya.online directly and
    // neither goes through Next, so the host decision cannot depend on the path.
    expect(routeToApi('api.darshya.online', '/')).toBe(true);
    expect(routeToApi('api.darshya.online', '/anything/at/all')).toBe(true);
    expect(routeToApi('api.darshya.online', '/pujas')).toBe(true);
  });

  it('still matches when the host carries a port', () => {
    expect(routeToApi('api.darshya.online:10000', '/')).toBe(true);
  });

  it('is case-insensitive, because Host headers are not normalised', () => {
    expect(routeToApi('API.Darshya.Online', '/')).toBe(true);
  });

  it('sends the apex and www to the web app', () => {
    expect(routeToApi('darshya.online', '/')).toBe(false);
    expect(routeToApi('www.darshya.online', '/temples')).toBe(false);
  });

  it('does not treat a host merely CONTAINING "api" as the API host', () => {
    // `rapid.darshya.online` and `/api-guide` must not be captured by a loose
    // substring match — this is the classic over-broad-regex bug.
    expect(routeToApi('rapid.darshya.online', '/')).toBe(false);
    expect(routeToApi('therapist.darshya.online', '/')).toBe(false);
  });
});

describe('routeToApi — path fallback for same-origin calls', () => {
  it('routes the API prefix and ops paths on the web host', () => {
    expect(routeToApi('darshya.online', '/api/v1/temples')).toBe(true);
    expect(routeToApi('darshya.online', '/health')).toBe(true);
    expect(routeToApi('darshya.online', '/healthz')).toBe(true);
    expect(routeToApi('darshya.online', '/ops/scheduler')).toBe(true);
  });

  it('keeps a query string from defeating the match', () => {
    expect(routeToApi('darshya.online', '/api/v1/temples?limit=1')).toBe(true);
    expect(routeToApi('darshya.online', '/health?deep=1')).toBe(true);
  });

  it('leaves Next-owned paths that merely START with those words alone', () => {
    // `/healthcare` and `/apiary` are web pages. A prefix match without the
    // boundary would steal them and serve a 404 from Fastify.
    expect(routeToApi('darshya.online', '/healthcare')).toBe(false);
    expect(routeToApi('darshya.online', '/apiary')).toBe(false);
  });

  it('routes a future API version to the API, not to Next', () => {
    // /api/v2 does not exist yet. It should still reach Fastify and get the
    // API's own 404 -- falling through to Next would 404 for the wrong reason
    // and would silently break the day a v2 ships.
    expect(routeToApi('darshya.online', '/api/v2/thing')).toBe(true);
  });

  it('routes Next assets and pages to the web app', () => {
    expect(routeToApi('darshya.online', '/_next/static/chunk.js')).toBe(false);
    expect(routeToApi('darshya.online', '/sitemap.xml')).toBe(false);
    expect(routeToApi('darshya.online', '/')).toBe(false);
  });
});

describe('routeToApi — degenerate input', () => {
  it('never throws on a missing host or url', () => {
    // Node gives us `undefined` for a malformed request rather than a string;
    // the proxy must still pick a side instead of crashing the only container.
    expect(routeToApi(undefined, undefined)).toBe(false);
    expect(routeToApi('', '')).toBe(false);
    expect(routeToApi(null, '/health')).toBe(true);
  });
});
