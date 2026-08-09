# apps\web\components\AartiOptIn.tsx

- getAccessToken · function · L22-L30 — Extracts the user's access token from the persisted poojly_session localStorage entry so notification endpoints can be called authenticated.
- detectPlatform · function · L32-L38 — Classifies the device as web, iOS, or Android from the user agent so the API records the correct platform for the push token.
- urlBase64ToUint8Array · function · L40-L47 — Decodes the server's URL-safe base64 VAPID public key into the Uint8Array form required by PushManager.subscribe as the applicationServerKey.
- AartiOptInProps · interface · L49-L51 — Props for AartiOptIn selecting between an inline text-button and a card-style presentation of the reminder toggle.
- AartiOptIn · function · L53-L198 — Stateful toggle component that restores the user's aarti-reminder preference from localStorage and renders enable/disable controls in inline or card form.
- enable · function · L67-L125 — Enables aarti reminders by verifying sign-in and push support, subscribing via the service worker with the server's VAPID key, and registering the subscription endpoint as the device token with aartiOptIn=true.
- disable · function · L127-L157 — Disables aarti reminders by unregistering the current push subscription's endpoint token on the server, unsubscribing locally, and clearing the stored opt-in flag.
