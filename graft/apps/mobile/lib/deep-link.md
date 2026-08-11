# apps\mobile\lib\deep-link.ts

- DeepLinkRoute · type · L32-L33 — Defines the {pathname, params} destination shape that parsed deep links produce for expo-router navigation.
- parseDeepLink · function · L38-L95 — Translates an incoming darshya:// or darshya.online URL string into the frozen push deep-link route table (puja, darshan, booking, consultation, chat, order, today), falling back to devotee home for anything unrecognized.
- DeepLinkRouter · interface · L97-L99 — Minimal push-only router abstraction that lets the hook accept a test override and stay portable across expo-router minor versions.
- useDeepLinkRouter · function · L101-L131 — Hook that subscribes to both cold-launch (getInitialURL) and warm-tap (url event) link sources and routes each through the parser into navigation, mounted inertly until push payloads carry deepLink.
- navigate · function · L106-L119 — Per-URL navigation handler that dedupes already-handled links, parses them, and pushes the route while swallowing any router error so a malformed deep link can never crash the app.
