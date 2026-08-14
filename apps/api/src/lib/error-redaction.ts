/**
 * AW-08 (prod sweep 2026-08-12, P1) — the 5xx response redactor.
 *
 * The sweep caught the API answering a plain GET with:
 *
 *   {"statusCode":500,"code":"P2023","message":"Invalid `prisma.astrologerProfile
 *    .findUnique()` invocation in E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\
 *    astrologer-portal.ts:53:52 ... Error creating UUID ..."}
 *
 * i.e. the ORM name, the failing query, the absolute path of the source file on
 * the server, and (for P2010) the raw SQL and the offending value. Two separate
 * defects produced that:
 *
 *  1. src/server.ts's custom error handler was registered AFTER every
 *     `server.register(routes, { prefix })` call. Fastify resolves a route's
 *     error handler from the encapsulation context the route was registered in,
 *     so the handler never ran for a single route in this API — Fastify's
 *     default serializer answered instead, in EVERY environment, production
 *     included. (Locked by error-redaction.test.ts's encapsulation tests.)
 *  2. Even when it did run, it gated redaction on `!isProd`, so dev and staging
 *     — the environments where the leak was observed and where third parties
 *     hit preview URLs — echoed everything.
 *
 * The rule here: a 5xx never carries driver internals, in any environment. A
 * 4xx keeps its message, because those are written for the caller — unless the
 * "4xx" is a driver error wearing a 4xx status, which is never user-facing.
 * Non-driver 5xx detail still echoes in development so debugging survives.
 *
 * Redaction is deliberately over-broad. A false positive costs one developer a
 * log lookup; a false negative publishes the server's filesystem layout.
 */

export interface SafeErrorBody {
  statusCode: number;
  error: string;
  message: string;
}

const GENERIC_5XX = 'Internal server error';
const GENERIC_NAME = 'InternalServerError';

/** Prisma's own error codes: P1xxx init, P2xxx query, P3xxx migrate, P5xxx data-proxy. */
const PRISMA_CODE = /^P\d{4}$/;

/**
 * Message shapes that mean "this text came out of the database layer".
 * `Invalid \`prisma.x.y()\` invocation` and `Raw query failed` are Prisma's;
 * the SQLSTATE and `invalid input syntax` shapes come straight from Postgres.
 */
const DRIVER_MESSAGE = [
  /invalid `prisma\./i,
  /\bprisma\.[a-z_$][\w$]*\.[a-z_$][\w$]*\(/i,
  /prismaclient/i,
  /raw query failed/i,
  /invalid input syntax for type/i,
  /\bsqlstate\b/i,
  /\bconstraint\b.*\bfailed\b/i,
  // An absolute path in an error message is a server-layout leak regardless of
  // which library produced it: E:\..., C:/..., /opt/render/..., /home/....
  /[A-Za-z]:[\\/]/,
  /(^|[\s(])\/(opt|home|usr|var|srv|app|root)\//,
];

function looksLikeDriverError(e: {
  name?: string;
  message?: string;
  code?: string;
}): boolean {
  if (typeof e.code === 'string' && PRISMA_CODE.test(e.code)) return true;
  if (typeof e.name === 'string' && /^prisma/i.test(e.name)) return true;
  const msg = typeof e.message === 'string' ? e.message : '';
  if (!msg) return false;
  return DRIVER_MESSAGE.some((re) => re.test(msg));
}

/**
 * Decide what a client is allowed to see for a given error.
 *
 * @param err  the thrown value, duck-typed — Fastify errors, Prisma errors and
 *             plain Errors all flow through here.
 * @param opts `isProd` mirrors `NODE_ENV === 'production'`.
 */
export function redactError(
  err: Record<string, unknown> | null | undefined,
  opts: { isProd: boolean },
): SafeErrorBody {
  const e = (err ?? {}) as {
    statusCode?: number;
    name?: string;
    message?: string;
    code?: string;
  };
  const rawStatus = typeof e.statusCode === 'number' ? e.statusCode : 500;
  const statusCode = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Driver internals are redacted unconditionally — prod, staging, dev, and
  // regardless of the status code someone attached to them.
  if (looksLikeDriverError(e)) {
    return {
      statusCode,
      error: isClientError ? (safeName(e.name) ?? 'BadRequest') : GENERIC_NAME,
      message: isClientError ? 'Request could not be processed.' : GENERIC_5XX,
    };
  }

  // 4xx messages are written for the caller: validation details, rate-limit
  // wording, "Astrologer not found." Keep them, in every environment.
  if (isClientError) {
    return {
      statusCode,
      error: safeName(e.name) ?? 'BadRequest',
      message: e.message ?? 'Request could not be processed.',
    };
  }

  // Non-driver 5xx: echo in dev for debugging, never in production.
  return {
    statusCode,
    error: opts.isProd ? GENERIC_NAME : (safeName(e.name) ?? GENERIC_NAME),
    message: opts.isProd ? GENERIC_5XX : (e.message ?? 'Something went wrong'),
  };
}

/** An error CLASS name can leak the stack too ("PrismaClientKnownRequestError"). */
function safeName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (/^prisma/i.test(name)) return undefined;
  return name;
}
