/**
 * Typed API client for the WealthTrack dashboard.
 *
 * Wraps the native fetch API with:
 *  - Consistent error parsing from the server's ApiErrorBody envelope
 *  - `ApiError` — a typed error class that surfaces status, human-readable
 *    message, and requestId for support tracing
 *  - `createApiClient()` — a factory that binds base URL and auth headers once
 */

/** Mirrors ApiErrorBody from apps/api/src/common/filters/http-exception.filter.ts */
interface ApiErrorBody {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  requestId?: string;
  timestamp: string;
}

/**
 * Thrown by `apiGet` and `apiMutate` when the server returns a non-2xx
 * response.  Consumers can display `error.message` directly to the user and
 * include `error.requestId` in bug reports so engineers can find the server log.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly requestId: string | undefined;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }

  /** Returns true for auth-related failures that should redirect to login. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function normaliseMessage(raw: string | string[]): string {
  return Array.isArray(raw) ? raw.join(' · ') : raw;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  const status = response.status;

  // Attempt to parse the structured error envelope first
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body.message) {
      return new ApiError(status, normaliseMessage(body.message), body.requestId);
    }
  } catch {
    // Response body is not JSON — fall through to generic message
  }

  // Fallback: use the HTTP status text
  const label =
    status === 400 ? 'Bad request'
    : status === 401 ? 'Authentication required'
    : status === 403 ? 'You do not have permission to perform this action'
    : status === 404 ? 'The requested resource was not found'
    : status === 409 ? 'A conflict occurred. Please refresh and try again'
    : status === 422 ? 'The submitted data could not be processed'
    : status === 429 ? 'Too many requests. Please wait a moment and try again'
    : status >= 500  ? 'A server error occurred. Please try again later'
    : `Unexpected error (HTTP ${status})`;

  // Grab the requestId from the response header if the body parse failed
  const requestId = response.headers.get('x-request-id') ?? undefined;
  return new ApiError(status, label, requestId);
}

export interface ApiClient {
  /** Performs a GET request and returns the typed response body. */
  get<T>(path: string): Promise<T>;
  /** Performs a mutation (POST / PATCH / PUT / DELETE) and returns the typed response body. */
  mutate<T>(method: string, path: string, body?: unknown): Promise<T>;
}

/**
 * Creates a configured API client bound to a specific base URL and set of
 * default request headers.
 *
 * Usage:
 * ```ts
 * const api = createApiClient(API_BASE_URL, dashboardRequestHeaders);
 * const data = await api.get<SummaryOverview>('dashboard/summary');
 * await api.mutate('POST', 'reports', payload);
 * ```
 */
export function createApiClient(
  baseUrl: string,
  defaultHeaders: Record<string, string>,
): ApiClient {
  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}/${path}`, {
      headers: defaultHeaders,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json() as Promise<T>;
  }

  async function mutate<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { ...defaultHeaders };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}/${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json() as Promise<T>;
  }

  return { get, mutate };
}
