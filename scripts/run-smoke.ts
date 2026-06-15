import 'dotenv/config';
import { spawnSync } from 'child_process';

process.env.SMOKE_TEST = 'true';

const result = spawnSync(
  'npx',
  ['jest', '--runInBand', '--config', 'jest.smoke.config.js'],
  {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
