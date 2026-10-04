import { describe, it, expect } from 'vitest';
import { resolveApiErrorBody } from './error-shapes.js';

/**
 * These fixtures are TRANSCRIBED from apps/api, not invented. Each one names
 * the handler it came from. If a route changes shape, this file is where the
 * client finds out.
 *
 * The defect this pins: `ApiClientError` was built from `data?.error?.message`,
 * but every Fastify route in this API sends a FLAT body where `data.error` is a
 * STRING. `.message` was therefore `undefined` and EVERY error on web, mobile
 * and admin read "Request failed with status <n>".
 */

describe('resolveApiErrorBody — shape A: flat { error: "<sentence>" }', () => {
  it('keeps the stock sentence store-orders.ts:226 sends on a 409', () => {
    const resolved = resolveApiErrorBody(
      { error: 'Insufficient stock for tulsi-mala (have 2, want 5)' },
      409,
    );
    expect(resolved.message).toBe('Insufficient stock for tulsi-mala (have 2, want 5)');
    expect(resolved.code).toBe('UNKNOWN_ERROR');
  });

  it('keeps the transition refusal store-orders.ts:431 sends', () => {
    expect(
      resolveApiErrorBody(
        { error: 'Cannot transition order from SHIPPED to PENDING.' },
        409,
      ).message,
    ).toBe('Cannot transition order from SHIPPED to PENDING.');
  });

  it('keeps the ownership refusal priest.ts:1195 sends', () => {
    expect(
      resolveApiErrorBody({ error: 'You do not own this offering.' }, 403).message,
    ).toBe('You do not own this offering.');
  });

  it('keeps the role gate store-admin.ts:97 sends', () => {
    expect(
      resolveApiErrorBody({ error: 'STORE_OWNER role required' }, 403).message,
    ).toBe('STORE_OWNER role required');
  });
});

describe('resolveApiErrorBody — shape B: sentence plus zod details/issues', () => {
  it('carries `details` through (priest.ts:410, store-admin.ts:116)', () => {
    const flatten = { formErrors: [], fieldErrors: { status: ['Required'] } };
    const resolved = resolveApiErrorBody(
      { error: 'Invalid query', details: flatten },
      400,
    );
    expect(resolved.details).toEqual(flatten);
  });

  it('carries `issues` through — payouts.ts:59 and account.ts:183 use that spelling', () => {
    const flatten = { formErrors: [], fieldErrors: { limit: ['Expected number'] } };
    const resolved = resolveApiErrorBody(
      { error: 'Invalid query', issues: flatten },
      400,
    );
    expect(resolved.details).toEqual(flatten);
  });
});

describe('resolveApiErrorBody — shape C: machine label + human message', () => {
  it('surfaces the unpaid-earnings sentence account-deletion.service.ts:408 wrote', () => {
    // routes/account.ts:88 — sendServiceError(AccountDeletionBlockedError).
    const resolved = resolveApiErrorBody(
      {
        error: 'AccountDeletionBlocked',
        code: 'UNPAID_EARNINGS',
        message:
          'You have ₹1,240.00 of unpaid earnings. Withdraw them (Payouts → Request payout) before deleting your account.',
        unpaidInr: 1240,
      },
      409,
    );
    expect(resolved.message).toContain('₹1,240.00 of unpaid earnings');
    expect(resolved.code).toBe('UNPAID_EARNINGS');
  });

  it('surfaces the KYC refusal rather than the label beside it', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'AccountDeletionBlocked',
          code: 'KYC_REQUIRED',
          message: 'Complete KYC before requesting a payout.',
        },
        409,
      ).message,
    ).toBe('Complete KYC before requesting a payout.');
  });

  it('surfaces the price-mismatch sentence store-orders.ts:253 sends', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'price_mismatch',
          message:
            'Prices changed while you were checking out. Please review your cart total and try again.',
          serverTotalInr: 698,
        },
        409,
      ).message,
    ).toContain('Prices changed while you were checking out');
  });

  it('surfaces the store-setup sentence store-admin.ts:208 sends — a label with SPACES', () => {
    // The deliberately-written 409 that, per the audits, no one on any platform
    // had ever seen. `error` reads like a sentence but `code` is the route's
    // own, so `message` is the actionable half.
    expect(
      resolveApiErrorBody(
        {
          code: 'store_profile_required',
          error: 'Store setup incomplete',
          message:
            'Finish setting up your store — add your store name — before listing products.',
        },
        409,
      ).message,
    ).toBe('Finish setting up your store — add your store name — before listing products.');
  });
});

describe('resolveApiErrorBody — shape D: HTTP status name + message', () => {
  it('reads past Fastify FST_ERR_CTP_EMPTY_JSON_BODY to the real explanation', () => {
    const resolved = resolveApiErrorBody(
      {
        statusCode: 400,
        code: 'FST_ERR_CTP_EMPTY_JSON_BODY',
        error: 'Bad Request',
        message: 'Body cannot be empty when content-type is set to application/json',
      },
      400,
    );
    expect(resolved.message).toBe(
      'Body cannot be empty when content-type is set to application/json',
    );
    expect(resolved.code).toBe('FST_ERR_CTP_EMPTY_JSON_BODY');
  });

  it('reads past "Not Found" to users.ts:283 ownership wording', () => {
    expect(
      resolveApiErrorBody(
        { error: 'Not Found', message: 'Address not found or does not belong to you.' },
        404,
      ).message,
    ).toBe('Address not found or does not belong to you.');
  });

  it('reads past "Validation Error" — lib/i18n.ts#sendLocalizedError', () => {
    const resolved = resolveApiErrorBody(
      {
        error: 'Validation Error',
        message: 'The request body is invalid.',
        code: 'INVALID_BODY',
        details: [{ path: ['fullName'], message: 'Required' }],
      },
      400,
    );
    expect(resolved.message).toBe('The request body is invalid.');
    expect(resolved.details).toEqual([{ path: ['fullName'], message: 'Required' }]);
  });

  it('reads past a single-token label like "gone" (admin-roadmap-orchestrator.ts:107)', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'gone',
          message:
            'Endpoint deprecated — orchestrator moved to GH Actions runner. Use /api/orchestrator-status on the web app (reads GitHub Actions REST API).',
        },
        410,
      ).message,
    ).toContain('Endpoint deprecated');
  });
});

describe('resolveApiErrorBody — shape E: localizer-injected generic message', () => {
  /**
   * plugins/error-localization.ts rule 5 bolts a catalogue sentence and a
   * status-derived code onto any 401/403/404/429/5xx body that carried no
   * `message`. Preferring `message` there would REPLACE the route's specific
   * refusal with a generic — exactly what that plugin refuses to do itself.
   */
  it('prefers the route sentence over the generic FORBIDDEN copy', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'You do not own this product.',
          message: 'You do not have permission to do that.',
          code: 'FORBIDDEN',
        },
        403,
      ).message,
    ).toBe('You do not own this product.');
  });

  it('prefers the suspension reason over the generic FORBIDDEN copy', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'Account suspended: repeated no-shows',
          message: 'You do not have permission to do that.',
          code: 'FORBIDDEN',
        },
        403,
      ).message,
    ).toBe('Account suspended: repeated no-shows');
  });

  it('prefers the route sentence over the generic NOT_FOUND copy', () => {
    expect(
      resolveApiErrorBody(
        {
          error: 'Gaushala not found.',
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
        },
        404,
      ).message,
    ).toBe('Gaushala not found.');
  });

  it('still prefers `message` when the code is the ROUTE’s own, not a generic', () => {
    // Rule 2 of the localizer: a body that names a catalogue code keeps its own
    // sentence and gets it TRANSLATED. The translation is the better answer.
    expect(
      resolveApiErrorBody(
        {
          error: 'The selected time slot is no longer available.',
          code: 'SLOT_UNAVAILABLE',
          message: 'यह समय स्लॉट अब उपलब्ध नहीं है।',
        },
        409,
      ).message,
    ).toBe('यह समय स्लॉट अब उपलब्ध नहीं है।');
  });
});

describe('resolveApiErrorBody — shape F: nested ApiError envelope', () => {
  it('still reads error.message / error.code / error.details', () => {
    const resolved = resolveApiErrorBody(
      {
        success: false,
        error: {
          code: 'UNAUTHORISED',
          message: 'Session expired.',
          details: { token: ['expired'] },
          statusCode: 401,
        },
      },
      401,
    );
    expect(resolved).toEqual({
      code: 'UNAUTHORISED',
      message: 'Session expired.',
      details: { token: ['expired'] },
    });
  });
});

describe('resolveApiErrorBody — fallbacks', () => {
  it('falls back to the status sentence when the body has nothing usable', () => {
    expect(resolveApiErrorBody({}, 500).message).toBe('Request failed with status 500');
    expect(resolveApiErrorBody({ error: '   ' }, 500).message).toBe(
      'Request failed with status 500',
    );
  });

  it('falls back for a non-object body (undefined, string, array)', () => {
    expect(resolveApiErrorBody(undefined, 502).message).toBe('Request failed with status 502');
    expect(resolveApiErrorBody('<html>502 Bad Gateway</html>', 502).message).toBe(
      'Request failed with status 502',
    );
    expect(resolveApiErrorBody([{ error: 'x' }], 502).message).toBe(
      'Request failed with status 502',
    );
  });

  it('never invents `details` when the route sent none', () => {
    expect(resolveApiErrorBody({ error: 'Booking not found.' }, 404).details).toBeUndefined();
  });
});
