import 'dotenv/config';
import { getEnv } from './config/env';
import { createApp } from './app';
import { getLogger } from './utils/logger';

async function main(): Promise<void> {
  const env = getEnv();
  const app = createApp();
  const log = getLogger({ component: 'api' });

  app.listen(env.PORT, () => {
    log.info({ port: env.PORT, tz: env.TZ }, 'API server started');
  });
}

main().catch((error: unknown) => {
  const log = getLogger({ component: 'api' });
  log.fatal({ err: error }, 'Failed to start API server');
  process.exit(1);
});
