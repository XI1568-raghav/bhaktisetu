import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEY = "NEXT_PUBLIC_POSTHOG_KEY";

async function loadFresh() {
  vi.resetModules();
  return await import("./feature-flags");
}

describe("feature-flags (server)", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = realFetch;
    delete process.env[ENV_KEY];
  });

  it("returns false when PostHog key is absent (no-op)", async () => {
    delete process.env[ENV_KEY];
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("any-flag", "user-1")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns false when flagKey or userId is empty", async () => {
    process.env[ENV_KEY] = "phc_test";
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("", "user-1")).toBe(false);
    expect(await isFeatureEnabled("flag", "")).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls /decide and returns boolean flag value", async () => {
    process.env[ENV_KEY] = "phc_test";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { "my-flag": true } }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("my-flag", "user-1")).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("treats non-control variant as enabled", async () => {
    process.env[ENV_KEY] = "phc_test";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        featureFlags: { "home-hero-cta-text": "watch-darshan" },
      }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { isFeatureEnabled, getFeatureFlag } = await loadFresh();
    expect(await isFeatureEnabled("home-hero-cta-text", "user-1")).toBe(true);
    expect(await getFeatureFlag("home-hero-cta-text", "user-1")).toBe(
      "watch-darshan",
    );
  });

  it("treats control variant as disabled", async () => {
    process.env[ENV_KEY] = "phc_test";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { f: "control" } }),
    }) as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("f", "user-1")).toBe(false);
  });

  it("caches per (flag, user) for 30s", async () => {
    process.env[ENV_KEY] = "phc_test";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { f: true } }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    await isFeatureEnabled("f", "u1");
    await isFeatureEnabled("f", "u1");
    await isFeatureEnabled("f", "u1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // Different user -> separate cache entry
    await isFeatureEnabled("f", "u2");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // Advance past TTL
    vi.advanceTimersByTime(31_000);
    await isFeatureEnabled("f", "u1");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("returns false on PostHog HTTP error", async () => {
    process.env[ENV_KEY] = "phc_test";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("f", "u1")).toBe(false);
  });

  it("returns false on network error", async () => {
    process.env[ENV_KEY] = "phc_test";
    global.fetch = vi.fn().mockRejectedValue(
      new Error("ECONNRESET"),
    ) as unknown as typeof fetch;
    const { isFeatureEnabled } = await loadFresh();
    expect(await isFeatureEnabled("f", "u1")).toBe(false);
  });
});
