import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * An async Fastify hook that answers the request (`reply.code(403).send(...)`)
 * and then simply returns does NOT stop the route handler. Fastify only skips
 * the handler when `reply.sent` is already true at the moment the hook settles,
 * and `reply.sent` flips only once the response has been written. Any async
 * `preSerialization` / `onSend` hook defers that write by a tick, so the handler
 * ran anyway: the caller saw a 403 while the mutation behind it still executed.
 * (2026-10-07: a pandit could settle its own payout request through
 * `/admin/bookings/payout-requests/:id/process` and a devotee could flip a
 * temple approval, both answered 403.)
 *
 * The documented idiom is to `return reply` after sending, which makes Fastify
 * wait for the response and then stop. The guards in this codebase are written
 * `reply.send(...); return;` in ~40 places, so rather than touch each one the
 * server wraps every route-level hook with this function: a hook that leaves a
 * 4xx/5xx status on the reply has answered, and is made to hand `reply` back.
 * Nothing has run before a preHandler but other hooks, so a status >= 400 at
 * that point can only have come from the hook itself.
 */
type AsyncHook = (request: FastifyRequest, reply: FastifyReply) => unknown;

const WRAPPED = Symbol.for('darshya.stopWhenAnswered');

export function stopWhenAnswered<H extends AsyncHook>(hook: H): H {
  if ((hook as unknown as Record<symbol, unknown>)[WRAPPED]) return hook;
  const wrapped = async function (request: FastifyRequest, reply: FastifyReply) {
    const result = await hook(request, reply);
    if (typeof reply.statusCode === 'number' && reply.statusCode >= 400) return reply;
    return result;
  };
  (wrapped as unknown as Record<symbol, unknown>)[WRAPPED] = true;
  return wrapped as unknown as H;
}

type HookSlot = unknown;

function wrapSlot(slot: HookSlot): HookSlot {
  const wrapOne = (fn: unknown) =>
    // Callback-style hooks (request, reply, done) take a 3rd argument and must
    // be left alone: wrapping them in an async function would never call done().
    typeof fn === 'function' && fn.length <= 2 ? stopWhenAnswered(fn as AsyncHook) : fn;
  return Array.isArray(slot) ? slot.map(wrapOne) : wrapOne(slot);
}

/** Use inside `server.addHook('onRoute', ...)`: wraps the route's own guard hooks. */
export function wrapRouteGuards(routeOpts: {
  onRequest?: unknown;
  preValidation?: unknown;
  preHandler?: unknown;
}): void {
  for (const key of ['onRequest', 'preValidation', 'preHandler'] as const) {
    if (routeOpts[key]) routeOpts[key] = wrapSlot(routeOpts[key]);
  }
}
