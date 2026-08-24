/**
 * API client. Every call goes through here so error handling and the base URL
 * are defined once. Vite proxies /api to the backend in development.
 */

import { clearTokens, getAccessToken, refreshAccessToken } from './tokenStore';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Set by AuthContext on mount; called when a request is unauthenticated even
 * after a refresh attempt, so the app can redirect to /login. Not wired
 * directly to router state here — this module has no React dependency. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function doFetch(path: string, init: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const isFormData = init.body instanceof FormData;
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      // FormData must NOT get an explicit content-type — the browser sets
      // its own multipart boundary, and overriding it here would break the
      // upload silently.
      ...(isFormData ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await doFetch(path, init);

  // A 401 might just mean the access token expired — try one silent refresh
  // before giving up, rather than bouncing the user to /login on every
  // 7-day token boundary.
  if (res.status === 401 && getAccessToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, init);
    } else {
      clearTokens();
      onSessionExpired?.();
    }
  }

  if (!res.ok) {
    // The API sends { error } on failure; fall back to the status text if a
    // proxy or crash returned something that is not JSON.
    const body = await res.json().catch(() => ({}) as { error?: string });
    if (res.status === 401) onSessionExpired?.();
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
