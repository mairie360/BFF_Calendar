import { spawnSync } from 'node:child_process';
import path from 'node:path';

// src/index.ts checks the upstream configuration before listening: a BFF without its upstream URLs must
// refuse to start (no localhost default) instead of answering 503 on every call.
const root = path.resolve(__dirname, '..');
const tsx = require.resolve('tsx/cli', { paths: [root] });

test('refuses to start when the upstream URLs are missing, naming every variable', () => {
  // An empty value counts as missing and is never overridden by a local .env (dotenv keeps set variables).
  const result = spawnSync(process.execPath, [tsx, 'src/index.ts'], {
    cwd: root,
    env: { ...process.env, CALENDAR_API_URL: '', CORE_API_URL: '', PORT: '0' },
    encoding: 'utf8',
    timeout: 30_000,
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Missing or invalid upstream configuration: CALENDAR_API_URL, CORE_API_URL');
});

test('refuses to start without JWT_SECRET, which verifies the session tokens', () => {
  const result = spawnSync(process.execPath, [tsx, 'src/index.ts'], {
    cwd: root,
    env: { ...process.env, CALENDAR_API_URL: 'calendar.test', CORE_API_URL: 'core.test', JWT_SECRET: '', PORT: '0' },
    encoding: 'utf8',
    timeout: 30_000,
  });

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Missing configuration: JWT_SECRET');
});
