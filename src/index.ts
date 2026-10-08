// First: load .env before any module can read the environment.
import 'dotenv/config';
import { assertConfigured } from '@mairie360/bffs-lib';
import app from './app';

/** Every upstream service the BFF calls (`<SERVICE>_URL`, optional `<SERVICE>_PORT`). */
export const UPSTREAMS = ['CALENDAR_API', 'CORE_API'] as const;

if (require.main === module) {
  // Fail fast: refuse to start, naming every missing or invalid upstream URL, instead of answering 503.
  assertConfigured(UPSTREAMS);
  // The session tokens are verified with it (bffs-lib requireSession): without it every session route answers 503.
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('Missing configuration: JWT_SECRET');
  }
  const port = Number(process.env.PORT ?? 4002);
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`OpenAPI documentation available at http://localhost:${port}/docs`);
  });
}
