/**
 * Access/refresh token storage, isolated from AuthContext so the plain API
 * client (lib/api.ts) can read and refresh tokens without importing React —
 * the fetch layer needs this on every request; only the UI needs the context.
 */

const ACCESS_KEY = 'dyornal.accessToken';
const REFRESH_KEY = 'dyornal.refreshToken';

// Empty string keeps requests relative in dev, where Vite proxies /api to the
// backend. In production, set VITE_API_URL to the deployed backend's origin.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Coalesces concurrent refresh attempts — if five requests 401 at once, only
 * one refresh call goes out and the rest await its result, rather than each
 * independently racing to replace the same session.
 */
let refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const body = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(body.accessToken, body.refreshToken);
    return true;
  } catch {
    return false;
  }
}
