import crypto from 'crypto';
import net from 'net';
import tls from 'tls';
import { env } from '../config/env';

export interface EmailSendRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'NOTIFICATION' | 'PATIENT_OTP_LOGIN';
}

export interface EmailDeliveryResult {
  configured: boolean;
  delivered: boolean;
  provider: string;
  messageId?: string;
  errorCode?: string;
  message: string;
}

export type CustomEmailTransport = (req: EmailSendRequest) => Promise<{ messageId?: string }>;

/**
 * Transactional email delivery service supporting SMTP (SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASSWORD + EMAIL_FROM)
 * without requiring third-party API keys.
 */
export class EmailDeliveryService {
  private static customTransport: CustomEmailTransport | null = null;

  static setTestTransport(transport: CustomEmailTransport | null) {
    this.customTransport = transport;
  }

  private static getSmtpConfig() {
    const host = (process.env.SMTP_HOST ?? env.SMTP_HOST ?? '').trim();
    const port = Number.parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT || 587), 10);
    const user = (process.env.SMTP_USER ?? env.SMTP_USER ?? '').trim();
    const pass = (process.env.SMTP_PASSWORD ?? env.SMTP_PASSWORD ?? '').trim();
    const from = (process.env.EMAIL_FROM || env.EMAIL_FROM || 'no-reply@medicore-health.in').trim();
    const isConfigured =
      Boolean(host) &&
      host !== 'smtp.example.org' &&
      Boolean(user) &&
      Boolean(pass) &&
      !pass.includes('CHANGE_ME') &&
      Number.isFinite(port) &&
      port > 0;
    return { host, port, user, pass, from, isConfigured };
  }

  static getActiveProviderName(): 'TEST' | 'SMTP' | 'UNCONFIGURED' {
    if (this.customTransport) return 'TEST';
    const smtp = this.getSmtpConfig();
    return smtp.isConfigured ? 'SMTP' : 'UNCONFIGURED';
  }

  static isConfigured(): boolean {
    return this.getActiveProviderName() !== 'UNCONFIGURED';
  }

  static async sendTransactionalEmail(req: EmailSendRequest): Promise<EmailDeliveryResult> {
    if (this.customTransport) {
      const res = await this.customTransport(req);
      return {
        configured: true,
        delivered: true,
        provider: 'CONFIGURED_TEST_TRANSPORT',
        messageId: res.messageId || `msg_${crypto.randomUUID()}`,
        message: 'Transactional email dispatched via configured email transport.',
      };
    }

    const activeProvider = this.getActiveProviderName();
    if (activeProvider === 'UNCONFIGURED') {
      return {
        configured: false,
        delivered: false,
        provider: 'UNCONFIGURED',
        errorCode: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message:
          'Email delivery is not configured on the server. Configure SMTP_* environment variables.',
      };
    }

    try {
      const messageId = await this.sendViaSmtp(req);
      return {
        configured: true,
        delivered: true,
        provider: 'SMTP',
        messageId,
        message: 'Transactional email dispatched via SMTP.',
      };
    } catch (err) {
      return {
        configured: true,
        delivered: false,
        provider: 'SMTP',
        errorCode: 'EMAIL_DELIVERY_FAILED',
        message: err instanceof Error ? err.message : 'SMTP delivery failed',
      };
    }
  }

  private static sendViaSmtp(req: EmailSendRequest): Promise<string> {
    const cfg = this.getSmtpConfig();
    const port = cfg.port;
    const useImplicitTls = port === 465;
    const messageId = `<${crypto.randomUUID()}@medicore-health.in>`;

    return new Promise((resolve, reject) => {
      const socket: net.Socket = useImplicitTls
        ? tls.connect({ host: cfg.host, port, servername: cfg.host })
        : net.createConnection({ host: cfg.host, port });

      socket.setTimeout(10000);
      let buffer = '';
      let step = 0;

      const sendCmd = (cmd: string) => {
        socket.write(`${cmd}\r\n`);
      };

      const cleanupError = (err: Error) => {
        socket.destroy();
        reject(err);
      };

      socket.on('timeout', () => cleanupError(new Error('SMTP connection timeout')));
      socket.on('error', (err) => cleanupError(err));

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (!buffer.endsWith('\n')) return;
        const lines = buffer.trim().split(/\r?\n/);
        const lastLine = lines[lines.length - 1] || '';
        if (/^\d{3}-/.test(lastLine)) return;
        buffer = '';

        const code = parseInt(lastLine.slice(0, 3), 10);
        if (Number.isNaN(code) || code >= 400) {
          cleanupError(new Error(`SMTP server returned ${code}`));
          return;
        }

        if (step === 0) {
          step = 1;
          sendCmd('EHLO medicore-api');
        } else if (step === 1) {
          step = 2;
          sendCmd('AUTH LOGIN');
        } else if (step === 2) {
          step = 3;
          sendCmd(Buffer.from(cfg.user, 'utf8').toString('base64'));
        } else if (step === 3) {
          step = 4;
          sendCmd(Buffer.from(cfg.pass, 'utf8').toString('base64'));
        } else if (step === 4) {
          step = 5;
          sendCmd(`MAIL FROM:<${cfg.from}>`);
        } else if (step === 5) {
          step = 6;
          sendCmd(`RCPT TO:<${req.to}>`);
        } else if (step === 6) {
          step = 7;
          sendCmd('DATA');
        } else if (step === 7) {
          step = 8;
          const payload = [
            `From: MediCore Health <${cfg.from}>`,
            `To: <${req.to}>`,
            `Subject: ${req.subject}`,
            `Message-ID: ${messageId}`,
            `Date: ${new Date().toUTCString()}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            req.text,
            '.',
          ].join('\r\n');
          socket.write(`${payload}\r\n`);
        } else if (step === 8) {
          step = 9;
          sendCmd('QUIT');
          socket.end();
          resolve(messageId);
        }
      });
    });
  }
}
