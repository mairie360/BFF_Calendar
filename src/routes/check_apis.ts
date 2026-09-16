import { Router } from 'express';
import calendarApi, { calendarApiRootUrl } from '../clients/calendarClient';
import { checkCoreApi } from '../clients/coreDirectory';
import { CheckApiResponse, CheckApiResponseSchema } from '../views/check_api_view';
import { registry } from '../openapi-registry';

const router = Router();

registry.registerPath({
  method: 'get',
  path: '/check_apis',
  tags: ['Connectivity'],
  summary: "Vérifie la connexion avec l'API Core et Calendar (Rust)",
  responses: {
    200: {
      description: 'Connexion réussie',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
    502: {
      description: 'API Core ou Calendar injoignable',
      content: {
        'application/json': {
          schema: CheckApiResponseSchema,
        },
      },
    },
  },
});

// Chaque API est sondée par l'opération /health de son contrat.
async function isReachable(probe: () => Promise<unknown>): Promise<boolean> {
  try {
    await probe();
    return true;
  } catch {
    return false;
  }
}

router.get('/', async (_, res) => {
  // Les deux API sont sondées indépendamment : une panne de l'une ne masque pas l'état de l'autre.
  const [coreReachable, calendarReachable] = await Promise.all([
    isReachable(checkCoreApi),
    isReachable(() => calendarApi.health({ baseURL: calendarApiRootUrl(), timeout: 5_000 })),
  ]);
  const result: CheckApiResponse = {
    status: coreReachable && calendarReachable ? 'OK' : 'Error',
    core_api: coreReachable ? 'Connected' : 'Unreachable',
    calendar_api: calendarReachable ? 'Connected' : 'Unreachable',
  };

  res.status(coreReachable && calendarReachable ? 200 : 502).json(result);
});

export default router;
