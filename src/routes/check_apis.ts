import { checkApis, checkApisResponseSchema, withoutSession } from '@mairie360/bffs-lib';
import { Router } from 'express';
import calendarApi from '../clients/calendarClient';
import { coreApi } from '../clients/coreDirectory';
import { registry } from '../openapi-registry';

const router = Router();

// Every upstream API the BFF calls, probed through the /health operation of its contract with the same
// <SERVICE>_URL / _PORT as the real calls (an unconfigured one is reported unreachable).
const PROBE_TIMEOUT_MS = 5_000;
const UPSTREAMS = {
  core_api: () => coreApi.health(withoutSession('CORE_API', PROBE_TIMEOUT_MS)),
  calendar_api: () => calendarApi.health(withoutSession('CALENDAR_API', PROBE_TIMEOUT_MS)),
};

export const CheckApisResponseSchema = registry.register(
  'CheckApisResponse',
  checkApisResponseSchema(['core_api', 'calendar_api']),
);

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  security: [],
  tags: ['Connectivity'],
  summary: 'Checks that Core API and Calendar API are reachable',
  responses: {
    200: {
      description: 'Every upstream API is reachable',
      content: { 'application/json': { schema: CheckApisResponseSchema } },
    },
    502: {
      description: 'Core API or Calendar API is unreachable',
      content: { 'application/json': { schema: CheckApisResponseSchema } },
    },
  },
});

// Both APIs are probed independently: one failing does not hide the state of the other.
router.get('/', checkApis(UPSTREAMS));

export default router;
