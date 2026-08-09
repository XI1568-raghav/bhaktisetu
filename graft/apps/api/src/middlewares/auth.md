# apps\api\src\middlewares\auth.ts

- MarketplaceRole · type · L5-L5 — Enumerates the marketplace persona roles a user can hold, driving every role-gated route in the API.
- shouldRejectDemoTokensInProd · function · L15-L20 — Pure, unit-testable guard that decides whether the process must refuse to boot because demo tokens (which grant real admin sessions) are enabled in production.
- AuthUser · interface · L28-L36 — Shape of the authenticated user attached to every request, carrying identity plus marketplace roles and subscription tier for downstream authorization.
- FastifyRequest · interface · L39-L41 — Module augmentation that adds the optional currentUser field to FastifyRequest so handlers can access the authenticated user.
- extractBearerToken · function · L47-L58 — Pulls the session token from the Authorization header, falling back to the httpOnly darshya_session cookie so web clients can keep tokens out of localStorage.
- rejectIfBlocked · function · L65-L79 — Single chokepoint that rejects suspended accounts with a 403 (not 401) so the frontend shows an 'account suspended' screen instead of bouncing to login.
- authenticateUser · function · L85-L332 — preHandler hook that authenticates every request by dispatching on token type (demo, magic-link email session, or Supabase JWT), resolving the Prisma user, enforcing the blocked gate, and attaching roles to the request.
- requireRole · function · L338-L413 — Factory for role-gate preHandlers whose critical rule is that the 'priest' role requires an ACTIVE Priest DB row — a PANDIT role alone must not reach priest endpoints.
- requireAnyRole · function · L418-L439 — Factory for a preHandler that allows the request through if the authenticated user holds at least one of the listed marketplace roles, else 403.
- registerAuthDecorators · function · L445-L447 — Boot-time registration that declares the currentUser request decorator on the Fastify instance.
