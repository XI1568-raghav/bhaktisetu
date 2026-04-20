// ──────────────────────────────────────────────
// @poojly/api-client — Base HTTP Client
// ──────────────────────────────────────────────

import type { ApiResponse, ApiError } from "@poojly/shared";

// ─── Types ───────────────────────────────────

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

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeout?: number;
  /** Skip auth header injection for this request */
  noAuth?: boolean;
}

export class ApiClientError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, string[]>;

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
  options: RequestOptions = {}
): Promise<T> {
  const config = getConfig();
  const { params, body, timeout, noAuth, headers: extraHeaders, ...fetchOptions } = options;

  const url = buildUrl(path, params);

  // Build headers
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
    ...config.defaultHeaders,
  });

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

  // Abort controller for timeout
  const controller = new AbortController();
  const timeoutMs = timeout ?? config.timeout ?? 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...fetchOptions,
    });

    clearTimeout(timeoutId);

    // Handle no-content responses
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      if (response.status === 401 && config.onUnauthorised) {
        config.onUnauthorised();
      }

      const apiError: ApiError = {
        success: false,
        error: {
          code: data?.error?.code ?? "UNKNOWN_ERROR",
          message:
            data?.error?.message ?? `Request failed with status ${response.status}`,
          details: data?.error?.details,
          statusCode: response.status,
        },
        timestamp: data?.timestamp ?? new Date().toISOString(),
      };

      throw new ApiClientError(apiError);
    }

    return data as T;
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
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { ...options, body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, { ...options, body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, { ...options, body });
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options);
  },
} as const;
