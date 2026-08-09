# apps\api\src\lib\fcm.ts

- CachedToken · interface · L29-L32 — In-memory holder for a Google OAuth access token and its expiry so token exchanges aren't repeated on every send.
- base64UrlEncode · function · L36-L39 — Encodes JWT header/claim/signature segments into the URL-safe base64 alphabet required by the JWT spec.
- maskToken · function · L41-L44 — Truncates device tokens to first/last 4 chars so error messages never leak full push tokens into logs.
- getAccessToken · function · L46-L85 — Mints and caches a Google OAuth access token by signing a JWT-bearer grant with the service-account RSA key, so sends authenticate without firebase-admin.
- FcmPayload · interface · L87-L91 — Shape of a push notification's title, body, and optional string data map accepted by the send functions.
- FcmSendResult · interface · L93-L98 — Result contract for a send attempt, distinguishing success, disabled-config skips, and dead-token expiry so callers know when to prune tokens from the DB.
- sendFcm · function · L100-L137 — Sends one push notification via the FCM v1 REST endpoint and classifies failures, flagging UNREGISTERED/INVALID_ARGUMENT responses as expired so the caller deletes the dead token.
- sendFcmMulticast · function · L139-L156 — Fans a payload out to many device tokens serially (since FCM v1 has no batch endpoint) and tallies sent, expired, and failed outcomes for upstream token pruning.
