import type { Request } from 'express';

/**
 * What every upstream call of a route needs: the incoming request, whose session is forwarded (its
 * `Authorization` header, through the lib's `asCaller`) and whose verified caller id `requireSession`
 * recorded (`sessionUserId`), and the upstream 4xx the route declares
 * in its contract, relayed as is by the lib's `callUpstream` (anything else becomes a 502).
 */
export interface CallContext {
  readonly req: Request;
  readonly declared: readonly number[];
}
