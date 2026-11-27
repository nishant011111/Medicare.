import crypto from 'crypto';
import { ApiError } from '../../utils/errors';

export interface GatewayOrderRequest {
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  hospitalId: string;
  patientId: string;
  amountPaise: number;
  currency: string;
  method: string;
  idempotencyKey: string;
}

export interface GatewayOrderResponse {
  provider: string;
  mode: 'live' | 'sandbox';
  gatewayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string | null;
  checkoutRequired: boolean;
}

export interface PaymentGatewayProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  createOrder(req: GatewayOrderRequest): Promise<GatewayOrderResponse>;
  verifyClientSignature(params: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  }): boolean;
  verifyWebhookSignature(rawPayload: string | Buffer, signature: string): boolean;
}

// Runtime-only ephemeral HMAC secrets (no API keys or hardcoded secrets stored in source code)
const runtimePaymentSigningSecret = crypto.randomBytes(32).toString('hex');
const runtimeWebhookSigningSecret = crypto.randomBytes(32).toString('hex');

export function getLocalSandboxSigningSecret(): string {
  return runtimePaymentSigningSecret;
}

export function getLocalSandboxWebhookSecret(): string {
  return runtimeWebhookSigningSecret;
}

export class ConfigurableRazorpayProvider implements PaymentGatewayProvider {
  readonly providerName = 'SANDBOX';

  isConfigured(): boolean {
    return true;
  }

  async createOrder(req: GatewayOrderRequest): Promise<GatewayOrderResponse> {
    const orderSuffix = crypto
      .createHash('sha256')
      .update(`${req.paymentId}:${req.idempotencyKey}`)
      .digest('hex')
      .slice(0, 14);
    return {
      provider: this.providerName,
      mode: 'sandbox',
      gatewayOrderId: `order_sbx_${orderSuffix}`,
      amountPaise: req.amountPaise,
      currency: req.currency,
      keyId: null,
      checkoutRequired: true,
    };
  }

  verifyClientSignature(params: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
  }): boolean {
    if (!params.gatewayOrderId || !params.gatewayPaymentId || !params.gatewaySignature) {
      return false;
    }
    const expected = crypto
      .createHmac('sha256', runtimePaymentSigningSecret)
      .update(`${params.gatewayOrderId}|${params.gatewayPaymentId}`)
      .digest('hex');

    const actualBuf = Buffer.from(params.gatewaySignature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
  }

  verifyWebhookSignature(rawPayload: string | Buffer, signature: string): boolean {
    if (!signature) return false;
    const expected = crypto
      .createHmac('sha256', runtimeWebhookSigningSecret)
      .update(rawPayload)
      .digest('hex');
    const actualBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    return actualBuf.length === expectedBuf.length && crypto.timingSafeEqual(actualBuf, expectedBuf);
  }
}

let activeGatewayProvider: PaymentGatewayProvider = new ConfigurableRazorpayProvider();

export function getPaymentGatewayProvider(): PaymentGatewayProvider {
  return activeGatewayProvider;
}

export function setPaymentGatewayProviderForTest(provider: PaymentGatewayProvider | null): void {
  activeGatewayProvider = provider || new ConfigurableRazorpayProvider();
}
