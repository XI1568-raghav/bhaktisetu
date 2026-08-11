# apps\mobile\app\(temple)\pujas.tsx

Temple-side screen listing configured puja offerings with local enable/disable switches, while directing creation of new puja types to the web portal.

- OfferingState · interface · L8-L11 — Per-puja local UI state tracking whether the offering is enabled and a priest is assigned.
- TemplePujas · function · L13-L80 — Screen component that renders the temple's puja offerings from the API with pull-to-refresh and per-offering availability toggles kept only in local state.
- toggleEnabled · function · L20-L25 — Flips a puja's enabled flag in component-local state (defaulting to enabled), so toggles affect only the UI and are never persisted to the backend.
- onRefresh · function · L27-L31 — Pull-to-refresh handler that refetches the pujas query while driving the refresh spinner.
