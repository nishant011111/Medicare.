import { ApiError } from './errors';

const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes a phone number into E.164 format (defaulting 10-digit Indian mobile numbers to +91).
 * Returns null when the input is blank or cannot be normalized to a valid phone number.
 */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip spaces, dashes, dots, and parentheses
  let cleaned = trimmed.replace(/[\s().-]/g, '');

  // Convert 00 prefix to +
  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  // Handle 10-digit Indian mobile numbers (6-9XXXXXXXXX)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`;
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned.slice(1)}`;
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+${cleaned}`;
  } else if (/^\d{8,15}$/.test(cleaned) && !cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }

  if (!E164_PHONE_REGEX.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function requireValidPhoneNumber(raw: string, fieldLabel = 'Phone number'): string {
  const normalized = normalizePhoneNumber(raw);
  if (!normalized) {
    throw ApiError.badRequest(
      `Enter a valid ${fieldLabel.toLowerCase()} (e.g. +91 98765 43210 or 10-digit mobile number).`,
      'INVALID_PHONE_NUMBER'
    );
  }
  return normalized;
}

export function maskPhoneNumber(phone?: string | null): string {
  const normalized = normalizePhoneNumber(phone) || (phone || '').trim();
  if (normalized.length <= 4) return '****';
  return `${normalized.slice(0, Math.min(4, normalized.length - 4))}••••${normalized.slice(-4)}`;
}
