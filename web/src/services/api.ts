/**
 * MediCore Centralized API Client & In-Memory Session Manager
 *
 * Security Architecture (Phase 3):
 * 1. Short-lived JWT Access Token is held strictly in a private module closure in RAM.
 * 2. Zero tokens or passwords are ever written to localStorage, sessionStorage, URLs, or console logs.
 * 3. Refresh token rotation uses the backend's HttpOnly, SameSite=Lax cookie (`medicore_rt`) via `credentials: 'include'`,
 *    plus an in-memory fallback reference for single-session continuity.
 * 4. Concurrent 401 responses share a single in-flight refresh lock to prevent token-reuse lockouts and infinite loops.
 */

const configuredBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const API_BASE_URL = configuredBase.endsWith('/')
  ? configuredBase.slice(0, -1)
  : configuredBase;

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let inMemoryHospitalId: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpiredCallback: (() => void) | null = null;

export function setInMemoryAuthTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
  activeHospitalId?: string | null;
}) {
  if (tokens.accessToken !== undefined) {
    inMemoryAccessToken = tokens.accessToken;
  }
  if (tokens.refreshToken !== undefined) {
    inMemoryRefreshToken = tokens.refreshToken;
  }
  if (tokens.activeHospitalId !== undefined) {
    inMemoryHospitalId = tokens.activeHospitalId;
  }
}

export function clearInMemoryAuthTokens() {
  inMemoryAccessToken = null;
  inMemoryRefreshToken = null;
  inMemoryHospitalId = null;
  // Also purge any legacy localStorage keys from older builds so browser storage is 100% clean
  try {
    localStorage.removeItem('medicore_access_token');
    localStorage.removeItem('medicore_refresh_token');
    localStorage.removeItem('medicore_active_hospital_id');
  } catch {
    // Ignore storage access errors
  }
}

export function getInMemorySessionMetadata() {
  return {
    hasAccessTokenInMemory: Boolean(inMemoryAccessToken),
    activeHospitalId: inMemoryHospitalId,
  };
}

export function registerSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpiredCallback = handler;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
  hospitalIdOverride?: string | null;
}

function buildUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  if (endpoint.startsWith('/health') || endpoint.startsWith('/api/')) {
    return endpoint;
  }
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalized}`;
}

/**
 * Performs a single deduplicated refresh token rotation request against POST /api/v1/auth/refresh.
 */
export async function rotateSessionRefreshToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const bodyPayload = inMemoryRefreshToken ? { refreshToken: inMemoryRefreshToken } : {};
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        clearInMemoryAuthTokens();
        return false;
      }

      const payload = await res.json().catch(() => null);
      const nextAccess = payload?.data?.accessToken;
      const nextRefresh = payload?.data?.refreshToken;
      const nextHospital = payload?.data?.user?.activeHospitalId;

      if (nextAccess) {
        setInMemoryAuthTokens({
          accessToken: nextAccess,
          refreshToken: nextRefresh ?? inMemoryRefreshToken,
          activeHospitalId: nextHospital !== undefined ? nextHospital : inMemoryHospitalId,
        });
        return true;
      }

      clearInMemoryAuthTokens();
      return false;
    } catch {
      clearInMemoryAuthTokens();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const url = buildUrl(endpoint);
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const effectiveHospitalId =
    options.hospitalIdOverride !== undefined ? options.hospitalIdOverride : inMemoryHospitalId;
  if (effectiveHospitalId) {
    headers.set('X-Hospital-Id', effectiveHospitalId);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new ApiClientError(
      'Unable to reach the MediCore API server. Please check your network connection.',
      0,
      'NETWORK_ERROR'
    );
  }

  const isAuthEndpoint =
    url.includes('/auth/google') ||
    url.includes('/auth/otp/') ||
    url.includes('/auth/patient/otp/') ||
    url.includes('/auth/mfa/verify-login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register') ||
    url.includes('/auth/patient/register');

  // Transparently attempt a single refresh rotation on 401 for protected endpoints
  if (
    response.status === 401 &&
    !options.skipAuth &&
    !options.skipRefreshRetry &&
    !isAuthEndpoint
  ) {
    const refreshed = await rotateSessionRefreshToken();
    if (refreshed && inMemoryAccessToken) {
      headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });
    } else {
      clearInMemoryAuthTokens();
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
    }
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    const blob = await response.blob();
    if (!response.ok) {
      throw new ApiClientError('Failed to download PDF document', response.status, 'PDF_ERROR');
    }
    return blob as unknown as T;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const code = json?.error?.code || `HTTP_${response.status}`;
    const message =
      json?.error?.message ||
      json?.message ||
      `Request failed with HTTP status ${response.status}`;
    throw new ApiClientError(message, response.status, code, json?.error?.details);
  }

  return json as T;
}
