import crypto from 'crypto';
import { env } from '../config/env';
import { ApiError } from './errors';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  activeHospitalId?: string | null;
  type: 'access';
  exp?: number;
  iat?: number;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // token record id
  familyId: string;
  type: 'refresh';
  exp?: number;
  iat?: number;
}

let argon2Lib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  argon2Lib = require('argon2');
} catch {
  argon2Lib = null;
}

/**
 * Hash plain-text password using Argon2id (with RFC-compatible scrypt fallback when native binary is unavailable)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (argon2Lib) {
    return argon2Lib.hash(plainPassword, {
      type: argon2Lib.argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });
  }
  const salt = crypto.randomBytes(16);
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(plainPassword, salt, 32, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `$argon2id$v=19$m=${env.ARGON2_MEMORY_COST},t=${env.ARGON2_TIME_COST},p=${env.ARGON2_PARALLELISM}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

/**
 * Verify password against Argon2id hash
 */
export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
  try {
    if (argon2Lib) {
      return await argon2Lib.verify(hash, plainPassword);
    }
    const parts = hash.split('$');
    if (parts.length < 6 || parts[1] !== 'argon2id') return false;
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    const actual = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(plainPassword, salt, expected.length, (err, key) =>
        err ? reject(err) : resolve(key)
      );
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Hash opaque or JWT refresh/verification tokens with SHA-256 before storing in DB
 */
export function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateRandomCode(digits = 6): string {
  const max = Math.pow(10, digits);
  const min = Math.pow(10, digits - 1);
  return String(crypto.randomInt(min, max));
}

function parseDurationSeconds(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') return expiresIn;
  const match = /^(\d+)([smhd])$/.exec(String(expiresIn).trim());
  if (!match) return 900;
  const val = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return val;
  if (unit === 'm') return val * 60;
  if (unit === 'h') return val * 3600;
  if (unit === 'd') return val * 86400;
  return 900;
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: nowSec,
      exp: nowSec + ttlSeconds,
      jti: payload.jti ?? crypto.randomUUID(),
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyHs256Jwt<T extends { exp?: number }>(
  token: string,
  secret: string,
  expiredCode: string,
  invalidCode: string
): T {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw ApiError.unauthorized('Malformed JWT token', invalidCode);
  }
  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw ApiError.unauthorized('Invalid JWT signature', invalidCode);
  }
  let decoded: T;
  try {
    decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    throw ApiError.unauthorized('Invalid JWT payload', invalidCode);
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof decoded.exp === 'number' && decoded.exp < nowSec) {
    throw ApiError.unauthorized('Token has expired', expiredCode);
  }
  return decoded;
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, 'type'>,
  expiresIn: string | number = env.JWT_ACCESS_EXPIRES_IN
): string {
  const fullPayload: AccessTokenPayload = { ...payload, type: 'access' };
  return signHs256Jwt(fullPayload as unknown as Record<string, unknown>, env.JWT_ACCESS_SECRET, parseDurationSeconds(expiresIn));
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, 'type'>,
  expiresInDays: number = env.JWT_REFRESH_EXPIRES_IN_DAYS
): string {
  const fullPayload: RefreshTokenPayload = { ...payload, type: 'refresh' };
  return signHs256Jwt(
    fullPayload as unknown as Record<string, unknown>,
    env.JWT_REFRESH_SECRET,
    expiresInDays * 86400
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = verifyHs256Jwt<AccessTokenPayload>(
    token,
    env.JWT_ACCESS_SECRET,
    'TOKEN_EXPIRED',
    'INVALID_TOKEN'
  );
  if (decoded.type !== 'access') {
    throw ApiError.unauthorized('Invalid token type', 'INVALID_TOKEN');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = verifyHs256Jwt<RefreshTokenPayload>(
    token,
    env.JWT_REFRESH_SECRET,
    'REFRESH_TOKEN_EXPIRED',
    'INVALID_REFRESH_TOKEN'
  );
  if (decoded.type !== 'refresh') {
    throw ApiError.unauthorized('Invalid refresh token type', 'INVALID_REFRESH_TOKEN');
  }
  return decoded;
}
