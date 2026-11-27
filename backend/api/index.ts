import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../src/app';
import { seedDatabaseIfEmpty } from '../src/database/seed';

const app = createApp();
let seeded = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!seeded) {
    await seedDatabaseIfEmpty();
    seeded = true;
  }
  return app(req as any, res as any);
}
