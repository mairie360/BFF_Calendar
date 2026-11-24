// First: load .env before any module can read the environment.
import 'dotenv/config';
import type { Server } from 'node:http';
// Before the app: OpenTelemetry must hook Express before it is loaded (MAIR-504).
import './telemetry';
import { assertConfigured, gracefulShutdown, type GracefulShutdown, sessionKeysFromEnv } from '@mairie360/bffs-lib';
import app from './app';
import { logger } from './logger';

/** Every upstream service the BFF calls (`<SERVICE>_URL`, optional `<SERVICE>_PORT`). */
export const UPSTREAMS = ['CALENDAR_API', 'CORE_API'] as const;

/**
 * Fail-fast startup check: a missing or invalid upstream URL (every one is named), or no session key, stops the
 * process instead of answering 503 later. The session tokens are verified with Core's public key `JWT_PUBLIC_KEY`
 * (MAIR-680, bffs-lib requireSession). Since bffs-lib 3 HS256 tokens are refused and `JWT_SECRET` is ignored.
 */
export function assertStartupConfiguration(): void {
  assertConfigured(UPSTREAMS);
  let keys: ReturnType<typeof sessionKeysFromEnv>;
  try {
    keys = sessionKeysFromEnv();
  } catch {
    // The parsing detail is not needed to fix it, and the key is not logged.
    throw new Error('Invalid configuration: JWT_PUBLIC_KEY must hold Ed25519 PUBLIC KEY PEM blocks');
  }
  if (keys === undefined) {
    throw new Error('Missing configuration: JWT_PUBLIC_KEY');
  }
}

/** Listens and drains on SIGTERM instead of dropping the requests in flight (bffs-lib gracefulShutdown). */
export function serve(port: number): { server: Server; shutdown: GracefulShutdown } {
  const server = app.listen(port, () => {
    logger.info('server listening', { port, docs: '/docs' });
  });
  return { server, shutdown: gracefulShutdown(server) };
}

if (require.main === module) {
  assertStartupConfiguration();
  const port = Number(process.env.PORT ?? 4002);
  serve(port);
}
