# packages\api-client\src\client.ts

- ZodSchema · interface · L19-L21 — interface ZodSchema<T>
- ApiClientConfig · interface · L23-L33 — interface ApiClientConfig
- RequestOptions · interface · L35-L56 — interface RequestOptions<T = unknown> extends Omit<RequestInit, "body">
- ApiClientError · class · L58-L70 — class ApiClientError extends Error
- constructor · method · L63-L69 — constructor(apiError: ApiError)
- initApiClient · function · L87-L89 — function initApiClient(config: ApiClientConfig): void
- getConfig · function · L94-L101 — function getConfig(): ApiClientConfig
- buildUrl · function · L106-L122 — function buildUrl( path: string, params?: Record<string, string | number | boolean | undefined> ): string
- request · function · L127-L280 — async function request<T>( method: string, path: string, options: RequestOptions<T> = {} ): Promise<T>
- get · method · L285-L287 — get<T>(path: string, options?: RequestOptions<T>): Promise<T>
- post · method · L289-L291 — post<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
- put · method · L293-L295 — put<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
- patch · method · L297-L299 — patch<T>(path: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
- delete · method · L301-L303 — delete<T>(path: string, options?: RequestOptions<T>): Promise<T>
