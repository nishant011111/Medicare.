import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import jwt, { JwtHeader, JwtPayload } from 'jsonwebtoken';
import { ApiError } from './errors';

export interface VerifiedFirebaseGoogleUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  picture: string | null;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJwks: Map<string, crypto.KeyObject> = new Map();
let cachedJwksExpiresAt = 0;

export function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }
  const configCandidates = [
    path.resolve(process.cwd(), '../firebase-applet-config.json'),
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
  ];
  for (const candidate of configCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as { projectId?: string };
        if (parsed.projectId?.trim()) {
          return parsed.projectId.trim();
        }
      }
    } catch {
      // Try next candidate
    }
  }
  return 'bionic-realm-pt8c4';
}

async function fetchFirebasePublicKey(kid: string): Promise<crypto.KeyObject> {
  const now = Date.now();
  if (now < cachedJwksExpiresAt && cachedJwks.has(kid)) {
    return cachedJwks.get(kid)!;
  }

  const response = await fetch(FIREBASE_JWKS_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new ApiError(
      503,
      'FIREBASE_JWKS_UNAVAILABLE',
      'Unable to fetch Google Firebase public verification keys'
    );
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;

  const body = (await response.json()) as { keys?: GoogleJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new ApiError(
      503,
      'FIREBASE_JWKS_UNAVAILABLE',
      'Invalid Google Firebase JWKS response'
    );
  }

  const nextMap = new Map<string, crypto.KeyObject>();
  for (const keyData of body.keys) {
    if (keyData.kid && keyData.kty === 'RSA') {
      const publicKey = crypto.createPublicKey({
        key: keyData as unknown as crypto.JsonWebKey,
        format: 'jwk',
      });
      nextMap.set(keyData.kid, publicKey);
    }
  }

  cachedJwks = nextMap;
  cachedJwksExpiresAt = now + maxAgeSeconds * 1000;

  const matched = cachedJwks.get(kid);
  if (!matched) {
    throw ApiError.unauthorized('Google ID token signing key is not recognized', 'INVALID_GOOGLE_TOKEN');
  }
  return matched;
}

let testVerifierOverride:
  | ((idToken: string) => Promise<VerifiedFirebaseGoogleUser>)
  | null = null;

export function setGoogleTokenVerifierForTest(
  verifier: ((idToken: string) => Promise<VerifiedFirebaseGoogleUser>) | null
) {
  testVerifierOverride = verifier;
}

export async function verifyFirebaseGoogleIdToken(
  idToken: string
): Promise<VerifiedFirebaseGoogleUser> {
  if (testVerifierOverride && process.env.NODE_ENV === 'test') {
    return testVerifierOverride(idToken);
  }

  const decodedComplete = jwt.decode(idToken, { complete: true }) as {
    header?: JwtHeader;
    payload?: JwtPayload;
  } | null;

  const kid = decodedComplete?.header?.kid;
  const alg = decodedComplete?.header?.alg;
  if (!kid || alg !== 'RS256') {
    throw ApiError.unauthorized('Invalid Google authentication token header', 'INVALID_GOOGLE_TOKEN');
  }

  const projectId = resolveFirebaseProjectId();
  const publicKey = await fetchFirebasePublicKey(kid);

  let verified: JwtPayload;
  try {
    const result = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    if (typeof result === 'string') {
      throw ApiError.unauthorized('Malformed Google token payload', 'INVALID_GOOGLE_TOKEN');
    }
    verified = result;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized(
      'Google sign-in session is invalid or expired. Please try signing in again.',
      'INVALID_GOOGLE_TOKEN'
    );
  }

  const uid = typeof verified.sub === 'string' ? verified.sub.trim() : '';
  const email = typeof verified.email === 'string' ? verified.email.trim().toLowerCase() : '';
  const emailVerified = verified.email_verified === true;
  const fullName =
    typeof verified.name === 'string' && verified.name.trim().length > 0
      ? verified.name.trim().slice(0, 120)
      : email.split('@')[0] || 'MediCore User';
  const picture =
    typeof verified.picture === 'string' && verified.picture.trim().length > 0
      ? verified.picture.trim().slice(0, 512)
      : null;

  if (!uid || !email) {
    throw ApiError.unauthorized(
      'Google account token is missing required identity claims.',
      'INVALID_GOOGLE_TOKEN'
    );
  }

  if (!emailVerified) {
    throw ApiError.forbidden(
      'Your Google account email must be verified before accessing MediCore.',
      'EMAIL_NOT_VERIFIED'
    );
  }

  return {
    uid,
    email,
    emailVerified,
    fullName,
    picture,
  };
}
