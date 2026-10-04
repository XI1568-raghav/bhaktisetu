// ──────────────────────────────────────────────
// @poojly/api-client — Base HTTP Client
// ──────────────────────────────────────────────

import type { ApiResponse, ApiError } from "@poojly/shared";
import { resolveApiErrorBody } from "./error-shapes.js";

// ─── Types ───────────────────────────────────

/**
 * Structural schema contract mirroring zod's `ZodType<T>` so callers can pass
 * a real `z.object({...})` schema (or any validator with the same `.parse()`
 * shape) without this package taking a hard runtime dependency on zod.
 *
 * `api-client` does not bundle zod; when a project has zod installed (e.g. via
 * `@poojly/shared` or directly), the schema flows through unchanged. A
 * `devDependency` on `zod` is declared so local type-checking of real zod
 * schemas resolves once `pnpm install` is run.
 */
export interface ZodSchema<T> {
  parse(input: unknown): T;
}

export interface ApiClientConfig {
  baseUrl: string;
  /** Function that returns the current auth token, or undefined if not logged in */
  getAuthToken?: () => string | undefined | Promise<string | undefined>;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Custom headers to include in every request */
  defaultHeaders?: Record<string, string>;
  /** Called when a 401 is received (e.g., to trigger re-auth) */
  onUnauthorised?: () => void;
}

export interface RequestOptions<T = unknown> extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeout?: number;
  /** Skip auth header injection for this request */
  noAuth?: boolean;
  /**
   * Optional schema to validate the parsed JSON body against before returning.
   * When provided, the response body is run through `schema.parse(data)`; a
   * parse failure throws an `ApiClientError` with code
   * `RESPONSE_SHAPE_MISMATCH` (HTTP 422). Omit to keep the unchecked `as T`
   * fallback (backward compatible).
   */
  schema?: ZodSchema<T>;
  /**
   * When true, the response body is expected to be an `ApiResponse<T>`
   * envelope (`{ success, data, ... }`) and `schema` (if any) is validated
   * against the unwrapped `data` field; the unwrapped `data` is returned.
   * When false/omitted, `schema` validates and the raw body is returned.
   */
  parseEnvelope?: boolean;
}

export class ApiClientError extends Error {
  public statusCode: number;
  public code: string;
  /**
   * Whatever the route attached under `details` / `issues`. `unknown` rather
   * than `Record<string, string[]>` because the three shapes actually sent —
   * zod `flatten()` (`{ formErrors, fieldErrors }`), `ZodIssue[]`, and the
   * ad-hoc objects account.ts spreads — are none of them that. Narrow at the
   * call site.
   */
  public details?: unknown;

  constructor(apiError: ApiError) {
    super(apiError.error.message);
    this.name = "ApiClientError";
    this.statusCode = apiError.error.statusCode;
    this.code = apiError.error.code;
    this.details = apiError.error.details;
  }
}

// ─── Client ──────────────────────────────────

let clientConfig: ApiClientConfig | null = null;

/**
 * Latch (P1-46): ensures `onUnauthorised` fires once for a burst of 401s.
 * The first 401 sets this true and invokes the handler; subsequent 401s that
 * arrive while the handler is in-flight skip the call. Reset to false after
 * the handler resolves/rejects.
 */
let unauthorisedInProgress = false;

/**
 * Initialise the API client. Call once at app startup.
 */
export function initApiClient(config: ApiClientConfig): void {
  clientConfig = config;
}

/**
 * Get the current client configuration. Throws if not initialised.
 */
function getConfig(): ApiClientConfig {
  if (!clientConfig) {
    throw new Error(
      "API client not initialised. Call initApiClient() first."
    );
  }
  return clientConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build a full URL from a path and optional query parameters.
 */
function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const config = getConfig();
  const url = new URL(path, config.baseUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Core request function with auth injection and error handling.
 */
async function request<T>(
  method: string,
  path: string,
  options: RequestOptions<T> = {}
): Promise<T> {
  const config = getConfig();
  const { params, body, timeout, noAuth, headers: extraHeaders, ...fetchOptions } = options;

  const url = buildUrl(path, params);

  /**
   * `null` counts as "no body" alongside `undefined`; every other value —
   * including the falsy `0`, `false` and `""` — is a body a caller meant to
   * send. The old test was `body ? … : undefined`, which silently dropped
   * those three.
   */
  const hasBody = body !== undefined && body !== null;

  // Build headers
  const headers = new Headers({
    Accept: "application/json",
    ...config.defaultHeaders,
  });

  // A JSON Content-Type on a request with NO body is what Fastify rejects with
  // FST_ERR_CTP_EMPTY_JSON_BODY, before the route handler ever runs. This
  // client set it unconditionally, so every bodyless mutation 400'd:
  // PATCH /priest/bookings/:id/accept, PATCH /priest/pujas/:id/toggle-active,
  // PATCH /consultation/:id/complete and the dispatch offer accept/decline
  // pair are all bodyless by design. Declare the type only when there is
  // something to describe.
  if (hasBody) headers.set("Content-Type", "application/json");

  // Inject auth token
  if (!noAuth && config.getAuthToken) {
    const token = await config.getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Merge extra headers
  if (extraHeaders) {
    const extraHeaderEntries =
      extraHeaders instanceof Headers
        ? Array.from(extraHeaders.entries())
        : Object.entries(extraHeaders);
    for (const [key, value] of extraHeaderEntries) {
      if (typeof value === "string") {
        headers.set(key, value);
      }
    }
  }

  // Belt and braces for the FST_ERR_CTP_EMPTY_JSON_BODY case above: neither a
  // `defaultHeaders` entry nor a per-request header may declare a content type
  // for a request that carries no content.
  if (!hasBody) headers.delete("Content-Type");

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutMs = timeout ?? config.timeout ?? 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...fetchOptions,
    });

    clearTimeout(timeoutId);

    // Handle no-content responses
    if (response.status === 204) {
      return undefined as T;
    }

    // On the ERROR path the body is parsed defensively. `response.json()`
    // throws on an empty or non-JSON body, and because that throw happened
    // before the `!response.ok` branch it took the status code with it: a
    // bodyless 401 (or a 502 HTML page from the CDN in front of the API)
    // surfaced as NETWORK_ERROR with statusCode 0, so `onUnauthorised` never
    // fired and no caller could branch on the status. The success path is
    // unchanged — a 2xx that is not JSON is still an error.
    const data: unknown = response.ok
      ? await response.json()
      : await response.json().catch(() => undefined);

    // Handle error responses
    if (!response.ok) {
      // P1-46: latch so a burst of 401s only triggers onUnauthorised once.
      if (response.status === 401 && config.onUnauthorised && !unauthorisedInProgress) {
        unauthorisedInProgress = true;
        // The handler may be async (e.g. token refresh). Reset the latch once
        // it settles. Handler errors are swallowed so the original 401 is the
        // error callers actually see — a misbehaving re-auth callback should
        // not mask the real unauthorised response.
        try {
          await Promise.resolve(config.onUnauthorised());
        } catch {
          /* ignore handler errors; 401 is surfaced below */
        } finally {
          unauthorisedInProgress = false;
        }
      }

      // The mapper reads the shapes the API ACTUALLY sends — flat
      // `{ error: "<sentence>" }` first and foremost. See error-shapes.ts for
      // the enumeration and the resolution order.
      const resolved = resolveApiErrorBody(data, response.status);

      const apiError: ApiError = {
        success: false,
        error: {
          code: resolved.code,
          message: resolved.message,
          ...(resolved.details !== undefined ? { details: resolved.details } : {}),
          statusCode: response.status,
        },
        timestamp:
          (isRecord(data) && typeof data["timestamp"] === "string"
            ? data["timestamp"]
            : undefined) ?? new Date().toISOString(),
      };

      throw new ApiClientError(apiError);
    }

    // P0-3a: optional schema validation of the response body. When
    // `parseEnvelope` is set the body is treated as an `ApiResponse<T>`
    // envelope and the inner `data` field is validated/returned instead.
    const payload: unknown = options.parseEnvelope
      ? (data as ApiResponse<T>)?.data
      : data;

    if (options.schema) {
      try {
        return options.schema.parse(payload);
      } catch (parseError) {
        throw new ApiClientError({
          success: false,
          error: {
            code: "RESPONSE_SHAPE_MISMATCH",
            message:
              parseError instanceof Error
                ? `Response did not match expected shape: ${parseError.message}`
                : "Response did not match expected shape",
            statusCode: 422,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return payload as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError({
        success: false,
        error: {
          code: "REQUEST_TIMEOUT",
          message: `Request timed out after ${timeoutMs}ms`,
          statusCode: 408,
        },
        timestamp: new Date().toISOString(),
      });
    }

    throw new ApiClientError({
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "An unknown network error occurred",
        statusCode: 0,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ─── HTTP Method Shortcuts ───────────────────

export const api = {
  get<T>(path: string, options?: RequestOptions<T>): Promise<T> {
    return request<T>("GET", path, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return request<T>("POST", path, { ...options, body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return request<T>("PUT", path, { ...options, body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T> {
    return request<T>("PATCH", path, { ...options, body });
  },

  delete<T>(path: string, options?: RequestOptions<T>): Promise<T> {
    return request<T>("DELETE", path, options);
  },
} as const;
