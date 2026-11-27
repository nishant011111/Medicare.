import net from 'net';
import tls from 'tls';
import { URL } from 'url';

export interface AccountAttemptRecord {
  count: number;
  lockoutCount: number;
  lockedUntilMs: number;
  lastFailedAtMs: number;
  distinctIps: string[];
}

export interface IpAttemptRecord {
  count: number;
  windowStartMs: number;
  lockedUntilMs: number;
  targetedAccounts: string[];
}

export interface LoginAttemptStore {
  readonly storeName: string;
  getAccountState(key: string): Promise<AccountAttemptRecord | null>;
  setAccountState(key: string, value: AccountAttemptRecord, ttlSeconds: number): Promise<void>;
  deleteAccountState(key: string): Promise<void>;
  getIpState(ip: string): Promise<IpAttemptRecord | null>;
  setIpState(ip: string, value: IpAttemptRecord, ttlSeconds: number): Promise<void>;
  deleteIpState(ip: string): Promise<void>;
  reset(): Promise<void>;
}

/**
 * In-memory LoginAttemptStore for single-instance local dev and deterministic testing.
 */
export class InMemoryLoginAttemptStore implements LoginAttemptStore {
  readonly storeName = 'MEMORY';
  private accountStates = new Map<string, { value: AccountAttemptRecord; expiresAt: number }>();
  private ipStates = new Map<string, { value: IpAttemptRecord; expiresAt: number }>();

  async getAccountState(key: string): Promise<AccountAttemptRecord | null> {
    const entry = this.accountStates.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.accountStates.delete(key);
      return null;
    }
    return {
      ...entry.value,
      distinctIps: [...entry.value.distinctIps],
    };
  }

  async setAccountState(key: string, value: AccountAttemptRecord, ttlSeconds: number): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.accountStates.set(key, {
      value: { ...value, distinctIps: [...value.distinctIps] },
      expiresAt,
    });
  }

  async deleteAccountState(key: string): Promise<void> {
    this.accountStates.delete(key);
  }

  async getIpState(ip: string): Promise<IpAttemptRecord | null> {
    const entry = this.ipStates.get(ip);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.ipStates.delete(ip);
      return null;
    }
    return {
      ...entry.value,
      targetedAccounts: [...entry.value.targetedAccounts],
    };
  }

  async setIpState(ip: string, value: IpAttemptRecord, ttlSeconds: number): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.ipStates.set(ip, {
      value: { ...value, targetedAccounts: [...value.targetedAccounts] },
      expiresAt,
    });
  }

  async deleteIpState(ip: string): Promise<void> {
    this.ipStates.delete(ip);
  }

  async reset(): Promise<void> {
    this.accountStates.clear();
    this.ipStates.clear();
  }
}

/**
 * Lightweight zero-dependency RESP2 Redis store adapter for multi-instance production deployments.
 * Falls back gracefully to an in-memory store if Redis is unreachable so logins never crash silently.
 */
export class RedisLoginAttemptStore implements LoginAttemptStore {
  readonly storeName = 'REDIS';
  private readonly redisUrl: URL;
  private readonly fallback = new InMemoryLoginAttemptStore();
  private readonly keyPrefix: string;

  constructor(redisUrlString: string, keyPrefix = 'medicore:auth:limit:') {
    this.redisUrl = new URL(redisUrlString);
    this.keyPrefix = keyPrefix;
  }

  private encodeCommand(args: string[]): string {
    const parts = [`*${args.length}\r\n`];
    for (const arg of args) {
      const byteLen = Buffer.byteLength(arg, 'utf8');
      parts.push(`$${byteLen}\r\n${arg}\r\n`);
    }
    return parts.join('');
  }

  private async runCommand(args: string[]): Promise<string | null> {
    const useTls = this.redisUrl.protocol === 'rediss:';
    const host = this.redisUrl.hostname || '127.0.0.1';
    const port = Number.parseInt(this.redisUrl.port || '6379', 10);
    const password = this.redisUrl.password ? decodeURIComponent(this.redisUrl.password) : '';

    return new Promise((resolve, reject) => {
      const socket: net.Socket = useTls
        ? tls.connect({ host, port, servername: host })
        : net.createConnection({ host, port });

      socket.setTimeout(2500);
      let buffer = '';
      let authenticated = !password;

      const fail = (err: Error) => {
        socket.destroy();
        reject(err);
      };

      socket.on('timeout', () => fail(new Error('Redis command timed out')));
      socket.on('error', (err) => fail(err));

      socket.on('connect', () => {
        if (password) {
          socket.write(this.encodeCommand(['AUTH', password]));
        } else {
          socket.write(this.encodeCommand(args));
        }
      });

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (!buffer.includes('\r\n')) return;

        if (!authenticated) {
          if (buffer.startsWith('+OK\r\n')) {
            authenticated = true;
            buffer = buffer.slice(5);
            socket.write(this.encodeCommand(args));
            return;
          }
          if (buffer.startsWith('-')) {
            fail(new Error('Redis authentication failed'));
            return;
          }
          return;
        }

        if (buffer.startsWith('$-1\r\n')) {
          socket.end();
          resolve(null);
          return;
        }
        if (buffer.startsWith('+') || buffer.startsWith(':')) {
          const line = buffer.split('\r\n')[0];
          socket.end();
          resolve(line.slice(1));
          return;
        }
        if (buffer.startsWith('-')) {
          const line = buffer.split('\r\n')[0];
          fail(new Error(line.slice(1)));
          return;
        }
        if (buffer.startsWith('$')) {
          const firstEnd = buffer.indexOf('\r\n');
          const len = Number.parseInt(buffer.slice(1, firstEnd), 10);
          const bodyStart = firstEnd + 2;
          if (Buffer.byteLength(buffer.slice(bodyStart), 'utf8') >= len + 2) {
            const payload = buffer.slice(bodyStart, bodyStart + len);
            socket.end();
            resolve(payload);
          }
        }
      });
    });
  }

  async getAccountState(key: string): Promise<AccountAttemptRecord | null> {
    try {
      const raw = await this.runCommand(['GET', `${this.keyPrefix}acct:${key}`]);
      return raw ? (JSON.parse(raw) as AccountAttemptRecord) : null;
    } catch {
      return this.fallback.getAccountState(key);
    }
  }

  async setAccountState(key: string, value: AccountAttemptRecord, ttlSeconds: number): Promise<void> {
    try {
      await this.runCommand([
        'SET',
        `${this.keyPrefix}acct:${key}`,
        JSON.stringify(value),
        'EX',
        String(Math.max(60, ttlSeconds)),
      ]);
    } catch {
      await this.fallback.setAccountState(key, value, ttlSeconds);
    }
  }

  async deleteAccountState(key: string): Promise<void> {
    try {
      await this.runCommand(['DEL', `${this.keyPrefix}acct:${key}`]);
    } catch {
      await this.fallback.deleteAccountState(key);
    }
  }

  async getIpState(ip: string): Promise<IpAttemptRecord | null> {
    try {
      const raw = await this.runCommand(['GET', `${this.keyPrefix}ip:${ip}`]);
      return raw ? (JSON.parse(raw) as IpAttemptRecord) : null;
    } catch {
      return this.fallback.getIpState(ip);
    }
  }

  async setIpState(ip: string, value: IpAttemptRecord, ttlSeconds: number): Promise<void> {
    try {
      await this.runCommand([
        'SET',
        `${this.keyPrefix}ip:${ip}`,
        JSON.stringify(value),
        'EX',
        String(Math.max(60, ttlSeconds)),
      ]);
    } catch {
      await this.fallback.setIpState(ip, value, ttlSeconds);
    }
  }

  async deleteIpState(ip: string): Promise<void> {
    try {
      await this.runCommand(['DEL', `${this.keyPrefix}ip:${ip}`]);
    } catch {
      await this.fallback.deleteIpState(ip);
    }
  }

  async reset(): Promise<void> {
    await this.fallback.reset();
  }
}

export function createDefaultLoginAttemptStore(): LoginAttemptStore {
  const redisUrl = (process.env.REDIS_URL || '').trim();
  if (redisUrl && !redisUrl.includes('placeholder')) {
    try {
      return new RedisLoginAttemptStore(redisUrl);
    } catch {
      return new InMemoryLoginAttemptStore();
    }
  }
  return new InMemoryLoginAttemptStore();
}
