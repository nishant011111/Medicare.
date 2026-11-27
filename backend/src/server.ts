import { createApp } from './app';
import { env } from './config/env';
import { seedDatabaseIfEmpty } from './database/seed';

async function bootstrap() {
  await seedDatabaseIfEmpty();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[MediCore Backend] Server listening on port ${env.PORT} (${env.API_PREFIX})`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start MediCore backend:', err);
  process.exit(1);
});
