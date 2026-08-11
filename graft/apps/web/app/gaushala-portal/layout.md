# apps\web\app\gaushala-portal\layout.tsx · [[client-side-auth-api-base-url-resolution]] [[gaushala-manager-portal]]

- CowIcon · function · L20-L24 — Placeholder icon component for the Cows nav entry; it renders an empty styled span, so it carries no logic.
- GaushalaSidebar · function · L35-L124 — Renders the portal's sidebar with brand, user identity, and navigation links, visually highlighting whichever link matches the current route and offering sign-out and back-to-site actions.
- isActive · function · L45-L46 — Determines whether a nav link is active by requiring an exact match for the portal root (to avoid it always matching) and a prefix match for all other sections.
- GaushalPortalShell · function · L126-L151 — Provides the responsive page shell that toggles a mobile slide-in sidebar with a backdrop overlay while keeping it statically visible on large screens.
- GaushalPortalLayout · function · L153-L159 — Exported layout that restricts the entire gaushala portal to users with the gaushala_manager role by wrapping the shell in an AuthGuard.
