# apps\web\lib\use-onboarding.ts

- subscribe · function · L13-L23 — Subscribes a React external-store listener to both the app-level onboarding event and the browser 'storage' event so all components and tabs stay in sync.
- getSnapshot · function · L25-L27 — Returns the current persisted onboarding state as the client snapshot for useSyncExternalStore.
- getServerSnapshot · function · L29-L31 — Returns null during SSR so server rendering never reads browser-only onboarding storage.
- UseOnboarding · type · L33-L39 — Type describing the onboarding hook's public API: current state, partial setter, reset, and first-run/feature-flag booleans.
- useOnboarding · function · L41-L56 — Hook that wires the onboarding store into React via useSyncExternalStore and derives whether the user is still in first-run onboarding.
