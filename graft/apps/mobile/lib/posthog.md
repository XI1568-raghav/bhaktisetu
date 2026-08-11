# apps\mobile\lib\posthog.ts

- PostHogLike · type · L16-L20 — Defines the minimal structural interface the wrapper needs from a PostHog client so the module compiles without statically importing the optional SDK.
- tryInit · function · L25-L45 — Lazily constructs the PostHog client exactly once, returning null (permanent noop) when the env key is missing or the optional package fails to load.
- capture · function · L47-L55 — Forwards an analytics event to PostHog only if the client initialized, swallowing all errors so telemetry can never crash the app.
- identify · function · L57-L63 — Associates the current user with PostHog when available, silently no-oping otherwise.
- reset · function · L65-L71 — Clears PostHog's identified user state (e.g. on logout) when the client exists, silently no-oping otherwise.
