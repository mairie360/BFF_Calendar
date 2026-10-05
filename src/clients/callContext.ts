import type { Request } from 'express';

/**
 * What every upstream call of a route needs: the incoming request, whose session is forwarded (only its
 * `Authorization` header is read, through the lib's `asCaller`), and the upstream 4xx the route declares
 * in its contract, relayed as is by the lib's `callUpstream` (anything else becomes a 502).
 */
export interface CallContext {
  readonly req: Pick<Request, 'headers'>;
  readonly declared: readonly number[];
}
