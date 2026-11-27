import crypto from 'crypto';
import { env } from '../config/env';
import { maskPhoneNumber } from './phone';

export interface SmsOtpSendRequest {
  to: string;
  otpCode: string;
  purpose: 'LOGIN' | 'REGISTER';
  expiresInSeconds: number;
}

export interface SmsOtpDeliveryResult {
  configured: boolean;
  delivered: boolean;
  provider: string;
  messageId?: string;
  errorCode?: string;
  devOtpPreview?: string;
  message: string;
}

export type CustomSmsTransport = (req: SmsOtpSendRequest) => Promise<{ messageId?: string }>;

/**
 * Keyless & pluggable SMS OTP delivery service.
 * Supports automated test hooks (`setTestTransport`), optional generic webhook (`SMS_WEBHOOK_URL`),
 * and a local development sandbox (returning `devOtpPreview` ONLY when `NODE_ENV === 'development'`).
 */
export class SmsOtpDeliveryService {
  private static customTransport: CustomSmsTransport | null = null;

  static setTestTransport(transport: CustomSmsTransport | null) {
    this.customTransport = transport;
  }

  static isWebhookConfigured(): boolean {
    const url = (process.env.SMS_WEBHOOK_URL || '').trim();
    return Boolean(url && /^https?:\/\//i.test(url));
  }

  static getActiveProviderName(): 'TEST' | 'WEBHOOK' | 'DEV_SMS_SANDBOX' | 'UNCONFIGURED' {
    if (this.customTransport) return 'TEST';
    if (this.isWebhookConfigured()) return 'WEBHOOK';
    const nodeEnv = (process.env.NODE_ENV || env.NODE_ENV).toLowerCase();
    if (nodeEnv === 'development') return 'DEV_SMS_SANDBOX';
    return 'UNCONFIGURED';
  }

  static isConfigured(): boolean {
    return this.getActiveProviderName() !== 'UNCONFIGURED';
  }

  static async sendOtp(req: SmsOtpSendRequest): Promise<SmsOtpDeliveryResult> {
    if (this.customTransport) {
      const res = await this.customTransport(req);
      return {
        configured: true,
        delivered: true,
        provider: 'CONFIGURED_TEST_TRANSPORT',
        messageId: res.messageId || `sms_${crypto.randomUUID()}`,
        message: 'Verification OTP dispatched via configured SMS transport.',
      };
    }

    const activeProvider = this.getActiveProviderName();
    if (activeProvider === 'WEBHOOK') {
      try {
        const webhookUrl = process.env.SMS_WEBHOOK_URL!.trim();
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: req.to,
            purpose: req.purpose,
            text: `Your MediCore verification OTP is ${req.otpCode}. Valid for ${Math.ceil(req.expiresInSeconds / 60)} minutes.`,
          }),
        });
        if (!resp.ok) {
          throw new Error(`SMS webhook responded with HTTP ${resp.status}`);
        }
        return {
          configured: true,
          delivered: true,
          provider: 'WEBHOOK',
          messageId: `sms_${crypto.randomUUID()}`,
          message: 'Verification OTP dispatched via configured SMS webhook.',
        };
      } catch (err) {
        return {
          configured: true,
          delivered: false,
          provider: 'WEBHOOK',
          errorCode: 'SMS_DELIVERY_FAILED',
          message: err instanceof Error ? err.message : 'SMS delivery failed',
        };
      }
    }

    if (activeProvider === 'DEV_SMS_SANDBOX') {
      // Never log raw OTPs in structured security audit logs; console output is masked
      console.info(
        `[DEV SMS SANDBOX] Dispatched ${req.purpose} OTP to ${maskPhoneNumber(req.to)}`
      );
      return {
        configured: true,
        delivered: true,
        provider: 'DEV_SMS_SANDBOX',
        messageId: `dev_sms_${crypto.randomUUID()}`,
        devOtpPreview: req.otpCode,
        message: 'Verification OTP sent to your mobile number (Development SMS Sandbox active).',
      };
    }

    return {
      configured: false,
      delivered: false,
      provider: 'UNCONFIGURED',
      errorCode: 'SMS_PROVIDER_NOT_CONFIGURED',
      message:
        'SMS OTP delivery is not configured on the server. Configure SMS_WEBHOOK_URL for external SMS dispatch.',
    };
  }
}
